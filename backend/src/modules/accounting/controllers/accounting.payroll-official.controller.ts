import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../../utils/prisma';
import {
  buildOfficialPayrollTotals,
  normalizeOfficialPayrollOutput,
  OfficialPayrollDetailRow,
  PayrollOfficialPostingError,
} from '../services/payroll-official-posting.p2';

const VERIFIED_PROFILE_CODE = 'ID-PAYROLL-2026';
const VERIFIED_PROFILE_VERSION = 2;
const PAYROLL_POSTING_LOCK = 78001;
const GENERAL_LEDGER_POSTING_LOCK = 77002;

const dbNumber = (value: unknown) => Number(value || 0);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const errorResponse = (res: Response, error: unknown) => {
  if (error instanceof PayrollOfficialPostingError) {
    return res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
  }
  return null;
};

const loadLockedPeriod = async (tx: Prisma.TransactionClient, tenantId: number, periodId: number) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id, tenant_id, period_start, period_end, pay_date, description, status,
           calculated_at, calculated_by, finalized_at, finalized_by
    FROM accounting.payroll_periods
    WHERE id = ${periodId} AND tenant_id = ${tenantId}
    FOR UPDATE
  `);
  if (!rows[0]) throw new PayrollOfficialPostingError('PAYROLL_PERIOD_NOT_FOUND', 'Periode payroll tidak ditemukan pada tenant ini');
  return rows[0];
};

const loadRun = async (tx: Prisma.TransactionClient, tenantId: number, periodId: number, runId: number) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id, tenant_id, period_id, profile_id, profile_code, profile_version,
           run_mode, tax_period_kind, rules_snapshot, input_snapshot, output_snapshot,
           calculated_by, calculated_at
    FROM public.payroll_calculation_runs
    WHERE id = ${runId} AND tenant_id = ${tenantId} AND period_id = ${periodId}
    LIMIT 1
  `);
  const run = rows[0];
  if (!run) throw new PayrollOfficialPostingError('OFFICIAL_VERIFICATION_RUN_NOT_FOUND', 'Verification run tidak ditemukan untuk periode ini');
  if (run.run_mode !== 'verification_preview') {
    throw new PayrollOfficialPostingError('OFFICIAL_RUN_MODE_INVALID', 'Hanya immutable verification_preview yang boleh menjadi source official payroll');
  }
  if (run.profile_code !== VERIFIED_PROFILE_CODE || Number(run.profile_version) !== VERIFIED_PROFILE_VERSION) {
    throw new PayrollOfficialPostingError('OFFICIAL_PROFILE_VERSION_INVALID', 'Official payroll hanya menerima verified profile ID-PAYROLL-2026 v2');
  }
  if (!['non_final', 'final'].includes(run.tax_period_kind)) {
    throw new PayrollOfficialPostingError('OFFICIAL_TAX_PERIOD_KIND_INVALID', 'Tax-period kind verification run tidak didukung');
  }
  return run;
};

const loadActiveTenantProfile = async (tx: Prisma.TransactionClient, tenantId: number, effectiveDate: Date) => {
  const date = effectiveDate.toISOString().slice(0, 10);
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id, tenant_id, profile_code, version, status, effective_from, effective_to,
           tax_method, tax_rule_reference, configuration, source_references
    FROM public.payroll_rate_profiles
    WHERE tenant_id = ${tenantId}
      AND profile_code = ${VERIFIED_PROFILE_CODE}
      AND version = ${VERIFIED_PROFILE_VERSION}
      AND status = 'active'
      AND effective_from <= ${date}::date
      AND (effective_to IS NULL OR effective_to >= ${date}::date)
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  `);
  if (!rows[0]) {
    throw new PayrollOfficialPostingError(
      'ACTIVE_TENANT_PAYROLL_PROFILE_REQUIRED',
      'Tenant harus memiliki active verified payroll profile v2 yang berlaku untuk periode ini sebelum official write-through',
    );
  }
  return rows[0];
};

const assertPeriodKindMatchesRun = (period: any, run: any) => {
  const month = new Date(period.period_end).getUTCMonth();
  if (run.tax_period_kind === 'final' && month !== 11) {
    throw new PayrollOfficialPostingError('FINAL_RUN_REQUIRES_DECEMBER_PERIOD', 'Final verification run hanya boleh diposting untuk periode Desember');
  }
  if (run.tax_period_kind === 'non_final' && month === 11) {
    throw new PayrollOfficialPostingError('DECEMBER_REQUIRES_FINAL_RUN', 'Periode Desember wajib memakai final verification run');
  }
};

const assertEmployeeScope = async (tx: Prisma.TransactionClient, tenantId: number, rows: OfficialPayrollDetailRow[]) => {
  const ids = rows.map((row) => row.employeeId);
  const employees = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id FROM accounting.employees
    WHERE tenant_id = ${tenantId} AND id IN (${Prisma.join(ids)})
  `);
  if (employees.length !== ids.length) {
    throw new PayrollOfficialPostingError('OFFICIAL_EMPLOYEE_SCOPE_MISMATCH', 'Verification run memuat employee di luar tenant atau employee yang sudah tidak valid');
  }
};

const loadAccountingSettings = async (tx: Prisma.TransactionClient, tenantId: number) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT s.*,
           se.normal_balance AS salary_expense_normal, se.is_active AS salary_expense_active,
           ee.normal_balance AS employer_expense_normal, ee.is_active AS employer_expense_active,
           sp.normal_balance AS salary_payable_normal, sp.is_active AS salary_payable_active,
           tp.normal_balance AS tax_payable_normal, tp.is_active AS tax_payable_active,
           bp.normal_balance AS bpjs_payable_normal, bp.is_active AS bpjs_payable_active,
           se.tenant_id AS salary_expense_tenant,
           ee.tenant_id AS employer_expense_tenant,
           sp.tenant_id AS salary_payable_tenant,
           tp.tenant_id AS tax_payable_tenant,
           bp.tenant_id AS bpjs_payable_tenant
    FROM public.payroll_accounting_settings s
    JOIN accounting.chart_of_accounts se ON se.id = s.salary_expense_account_id
    JOIN accounting.chart_of_accounts ee ON ee.id = s.employer_statutory_expense_account_id
    JOIN accounting.chart_of_accounts sp ON sp.id = s.salary_payable_account_id
    JOIN accounting.chart_of_accounts tp ON tp.id = s.pph21_payable_account_id
    JOIN accounting.chart_of_accounts bp ON bp.id = s.bpjs_payable_account_id
    WHERE s.tenant_id = ${tenantId}
    LIMIT 1
  `);
  const settings = rows[0];
  if (!settings) throw new PayrollOfficialPostingError('PAYROLL_ACCOUNTING_SETTINGS_REQUIRED', 'Mapping akun payroll wajib dikonfigurasi sebelum finalization');
  const tenantColumns = ['salary_expense_tenant','employer_expense_tenant','salary_payable_tenant','tax_payable_tenant','bpjs_payable_tenant'];
  if (tenantColumns.some((key) => Number(settings[key]) !== tenantId)) {
    throw new PayrollOfficialPostingError('PAYROLL_ACCOUNT_TENANT_MISMATCH', 'Semua akun payroll harus berasal dari tenant yang sama');
  }
  const activeColumns = ['salary_expense_active','employer_expense_active','salary_payable_active','tax_payable_active','bpjs_payable_active'];
  if (activeColumns.some((key) => settings[key] === false)) {
    throw new PayrollOfficialPostingError('PAYROLL_ACCOUNT_INACTIVE', 'Semua akun payroll harus aktif');
  }
  if (settings.salary_expense_normal !== 'DEBIT' || settings.employer_expense_normal !== 'DEBIT') {
    throw new PayrollOfficialPostingError('PAYROLL_EXPENSE_ACCOUNT_NORMAL_BALANCE_INVALID', 'Akun beban payroll harus memiliki normal balance DEBIT');
  }
  if (settings.salary_payable_normal !== 'CREDIT' || settings.tax_payable_normal !== 'CREDIT' || settings.bpjs_payable_normal !== 'CREDIT') {
    throw new PayrollOfficialPostingError('PAYROLL_PAYABLE_ACCOUNT_NORMAL_BALANCE_INVALID', 'Akun hutang payroll harus memiliki normal balance CREDIT');
  }
  return settings;
};

const comparePersistedDetails = (expected: OfficialPayrollDetailRow[], actual: any[], runId: number, profileId: number) => {
  if (actual.length !== expected.length) {
    throw new PayrollOfficialPostingError('OFFICIAL_DETAIL_COUNT_MISMATCH', 'Jumlah payroll detail berubah setelah materialization');
  }
  const actualMap = new Map(actual.map((row) => [Number(row.employee_id), row]));
  const fields: Array<[keyof OfficialPayrollDetailRow, string]> = [
    ['basicSalary','basic_salary'], ['totalAllowance','total_allowance'], ['overtimeHours','overtime_hours'],
    ['overtimePay','overtime_pay'], ['grossSalary','gross_salary'], ['bpjsKesEmployer','bpjs_kes_employer'],
    ['bpjsKesEmployee','bpjs_kes_employee'], ['jkk','jkk'], ['jkm','jkm'], ['jhtEmployer','jht_employer'],
    ['jhtEmployee','jht_employee'], ['jpEmployer','jp_employer'], ['jpEmployee','jp_employee'], ['pph21','pph21'],
    ['pph21Refund','pph21_refund'], ['totalDeductions','total_deductions'], ['netSalary','net_salary'], ['employerCost','employer_cost'],
  ];
  for (const row of expected) {
    const persisted = actualMap.get(row.employeeId);
    if (!persisted) throw new PayrollOfficialPostingError('OFFICIAL_DETAIL_EMPLOYEE_MISSING', `Payroll detail employee ${row.employeeId} hilang setelah materialization`);
    if (Number(persisted.source_calculation_run_id) !== runId || Number(persisted.source_profile_id) !== profileId || Number(persisted.source_profile_version) !== VERIFIED_PROFILE_VERSION) {
      throw new PayrollOfficialPostingError('OFFICIAL_DETAIL_SOURCE_MISMATCH', `Source evidence payroll detail employee ${row.employeeId} berubah`);
    }
    for (const [sourceKey, dbKey] of fields) {
      if (Math.abs(Number(row[sourceKey]) - dbNumber(persisted[dbKey])) > 0.01) {
        throw new PayrollOfficialPostingError('OFFICIAL_DETAIL_TAMPER_DETECTED', `Payroll detail employee ${row.employeeId} tidak lagi sama dengan immutable verification run`);
      }
    }
  }
};

export const getPayrollAccountingSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT s.*,
             se.account_code AS salary_expense_code, se.account_name AS salary_expense_name,
             ee.account_code AS employer_statutory_expense_code, ee.account_name AS employer_statutory_expense_name,
             sp.account_code AS salary_payable_code, sp.account_name AS salary_payable_name,
             tp.account_code AS pph21_payable_code, tp.account_name AS pph21_payable_name,
             bp.account_code AS bpjs_payable_code, bp.account_name AS bpjs_payable_name
      FROM public.payroll_accounting_settings s
      JOIN accounting.chart_of_accounts se ON se.id = s.salary_expense_account_id
      JOIN accounting.chart_of_accounts ee ON ee.id = s.employer_statutory_expense_account_id
      JOIN accounting.chart_of_accounts sp ON sp.id = s.salary_payable_account_id
      JOIN accounting.chart_of_accounts tp ON tp.id = s.pph21_payable_account_id
      JOIN accounting.chart_of_accounts bp ON bp.id = s.bpjs_payable_account_id
      WHERE s.tenant_id = ${tenantId}
      LIMIT 1
    `);
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    next(error);
  }
};

export const upsertPayrollAccountingSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId;
    const ids = {
      salaryExpense: Number(req.body.salaryExpenseAccountId),
      employerStatutoryExpense: Number(req.body.employerStatutoryExpenseAccountId),
      salaryPayable: Number(req.body.salaryPayableAccountId),
      pph21Payable: Number(req.body.pph21PayableAccountId),
      bpjsPayable: Number(req.body.bpjsPayableAccountId),
    };
    if (Object.values(ids).some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ success: false, error: { code: 'PAYROLL_ACCOUNT_IDS_REQUIRED', message: 'Lima account ID payroll wajib berupa integer positif' } });
    }
    const uniqueIds = [...new Set(Object.values(ids))];
    const accounts = await prisma.chart_of_accounts.findMany({
      where: { tenant_id: tenantId, id: { in: uniqueIds }, is_active: true },
      select: { id: true, normal_balance: true, account_code: true, account_name: true },
    });
    if (accounts.length !== uniqueIds.length) {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_ACCOUNT_SCOPE_INVALID', message: 'Semua akun payroll harus aktif dan berasal dari tenant ini' } });
    }
    const byId = new Map(accounts.map((account) => [account.id, account]));
    if (byId.get(ids.salaryExpense)?.normal_balance !== 'DEBIT' || byId.get(ids.employerStatutoryExpense)?.normal_balance !== 'DEBIT') {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_EXPENSE_ACCOUNT_NORMAL_BALANCE_INVALID', message: 'Akun beban payroll harus normal balance DEBIT' } });
    }
    if (byId.get(ids.salaryPayable)?.normal_balance !== 'CREDIT' || byId.get(ids.pph21Payable)?.normal_balance !== 'CREDIT' || byId.get(ids.bpjsPayable)?.normal_balance !== 'CREDIT') {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_PAYABLE_ACCOUNT_NORMAL_BALANCE_INVALID', message: 'Akun hutang payroll harus normal balance CREDIT' } });
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.payroll_accounting_settings
        (tenant_id, salary_expense_account_id, employer_statutory_expense_account_id,
         salary_payable_account_id, pph21_payable_account_id, bpjs_payable_account_id,
         updated_by, updated_at)
      VALUES
        (${tenantId}, ${ids.salaryExpense}, ${ids.employerStatutoryExpense},
         ${ids.salaryPayable}, ${ids.pph21Payable}, ${ids.bpjsPayable}, ${userId ?? null}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        salary_expense_account_id = EXCLUDED.salary_expense_account_id,
        employer_statutory_expense_account_id = EXCLUDED.employer_statutory_expense_account_id,
        salary_payable_account_id = EXCLUDED.salary_payable_account_id,
        pph21_payable_account_id = EXCLUDED.pph21_payable_account_id,
        bpjs_payable_account_id = EXCLUDED.bpjs_payable_account_id,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getPayrollOfficialMaterializations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.payroll_official_materializations
      WHERE tenant_id = ${tenantId}
      ORDER BY materialized_at DESC, id DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getPayrollOfficialPostings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.payroll_official_postings
      WHERE tenant_id = ${tenantId}
      ORDER BY posted_at DESC, id DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const materializePayrollOfficial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId;
    const periodId = Number(req.params.periodId);
    const runId = Number(req.body.verificationRunId);
    if (!Number.isInteger(periodId) || periodId <= 0 || !Number.isInteger(runId) || runId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'PERIOD_AND_RUN_REQUIRED', message: 'periodId dan verificationRunId wajib integer positif' } });
    }
    if (req.body.confirmOfficialMaterialization !== true) {
      return res.status(409).json({ success: false, error: { code: 'OFFICIAL_MATERIALIZATION_CONFIRMATION_REQUIRED', message: 'Official materialization membutuhkan konfirmasi eksplisit' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${PAYROLL_POSTING_LOCK})`);
      const period = await loadLockedPeriod(tx, tenantId, periodId);
      if (period.status === 'finalized') throw new PayrollOfficialPostingError('PAYROLL_PERIOD_ALREADY_FINALIZED', 'Periode finalized tidak dapat dimaterialisasi ulang');

      const existing = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.payroll_official_materializations
        WHERE tenant_id = ${tenantId} AND period_id = ${periodId}
        LIMIT 1
      `);
      if (existing[0]) {
        if (Number(existing[0].calculation_run_id) !== runId) {
          throw new PayrollOfficialPostingError('OFFICIAL_PERIOD_ALREADY_MATERIALIZED', 'Periode sudah dimaterialisasi dari verification run lain');
        }
        return { materialization: existing[0], idempotent: true };
      }

      const legacyRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id, source_calculation_run_id FROM accounting.payroll_details
        WHERE tenant_id = ${tenantId} AND period_id = ${periodId}
      `);
      if (legacyRows.length > 0) {
        throw new PayrollOfficialPostingError('EXISTING_PAYROLL_DETAILS_PRESENT', 'Periode sudah memiliki payroll_details; official materialization menolak overwrite/delete otomatis');
      }

      const run = await loadRun(tx, tenantId, periodId, runId);
      assertPeriodKindMatchesRun(period, run);
      const activeProfile = await loadActiveTenantProfile(tx, tenantId, new Date(period.period_end));
      const rows = normalizeOfficialPayrollOutput(run.output_snapshot, run.tax_period_kind as 'non_final' | 'final');
      await assertEmployeeScope(tx, tenantId, rows);
      const totals = buildOfficialPayrollTotals(rows);

      for (const row of rows) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO accounting.payroll_details
            (tenant_id, period_id, employee_id, basic_salary, total_allowance,
             overtime_hours, overtime_pay, gross_salary,
             bpjs_kes_employer, bpjs_kes_employee, jkk, jkm,
             jht_employer, jht_employee, jp_employer, jp_employee,
             pph21, pph21_refund, total_deductions, net_salary, employer_cost,
             source_calculation_run_id, source_profile_id, source_profile_version)
          VALUES
            (${tenantId}, ${periodId}, ${row.employeeId}, ${row.basicSalary}, ${row.totalAllowance},
             ${row.overtimeHours}, ${row.overtimePay}, ${row.grossSalary},
             ${row.bpjsKesEmployer}, ${row.bpjsKesEmployee}, ${row.jkk}, ${row.jkm},
             ${row.jhtEmployer}, ${row.jhtEmployee}, ${row.jpEmployer}, ${row.jpEmployee},
             ${row.pph21}, ${row.pph21Refund}, ${row.totalDeductions}, ${row.netSalary}, ${row.employerCost},
             ${runId}, ${Number(activeProfile.id)}, ${VERIFIED_PROFILE_VERSION})
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE accounting.payroll_periods
        SET status = 'calculated', calculated_at = NOW(), calculated_by = ${userId ?? null}
        WHERE id = ${periodId} AND tenant_id = ${tenantId}
      `);

      const materializations = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.payroll_official_materializations
          (tenant_id, period_id, calculation_run_id, profile_id, profile_version,
           tax_period_kind, detail_count, totals, materialized_by)
        VALUES
          (${tenantId}, ${periodId}, ${runId}, ${Number(activeProfile.id)}, ${VERIFIED_PROFILE_VERSION},
           ${run.tax_period_kind}, ${rows.length}, ${JSON.stringify(totals)}::jsonb, ${userId ?? null})
        RETURNING *
      `);
      return { materialization: materializations[0], totals, idempotent: false };
    });

    res.status(result.idempotent ? 200 : 201).json({ success: true, data: result });
  } catch (error) {
    const handled = errorResponse(res, error);
    if (handled) return handled;
    next(error);
  }
};

const nextPayrollJournalNumber = async (tx: Prisma.TransactionClient, tenantId: number, year: number) => {
  const prefix = `JPR-${year}-`;
  const last = await tx.journal_entries.findFirst({
    where: { tenant_id: tenantId, journal_number: { startsWith: prefix } },
    orderBy: { journal_number: 'desc' },
    select: { journal_number: true },
  });
  let next = 1;
  if (last?.journal_number) {
    const parsed = Number(last.journal_number.split('-').pop());
    if (Number.isInteger(parsed) && parsed > 0) next = parsed + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
};

export const finalizePayrollOfficial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId;
    const periodId = Number(req.params.periodId);
    if (!Number.isInteger(periodId) || periodId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD_ID', message: 'periodId tidak valid' } });
    }
    if (req.body.confirmOfficialFinalization !== true) {
      return res.status(409).json({ success: false, error: { code: 'OFFICIAL_FINALIZATION_CONFIRMATION_REQUIRED', message: 'Official payroll finalization membutuhkan konfirmasi eksplisit' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${PAYROLL_POSTING_LOCK})`);
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${GENERAL_LEDGER_POSTING_LOCK})`);
      const period = await loadLockedPeriod(tx, tenantId, periodId);

      const existingPosting = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.payroll_official_postings
        WHERE tenant_id = ${tenantId} AND period_id = ${periodId}
        LIMIT 1
      `);
      if (existingPosting[0]) {
        if (period.status !== 'finalized') {
          throw new PayrollOfficialPostingError('OFFICIAL_POSTING_PERIOD_STATE_MISMATCH', 'Posting sudah ada tetapi period belum finalized');
        }
        return { posting: existingPosting[0], idempotent: true };
      }
      if (period.status === 'finalized') {
        throw new PayrollOfficialPostingError('FINALIZED_WITHOUT_OFFICIAL_POSTING', 'Periode sudah finalized tanpa official posting evidence; manual investigation required');
      }
      if (period.status !== 'calculated') {
        throw new PayrollOfficialPostingError('OFFICIAL_MATERIALIZATION_REQUIRED', 'Periode harus berstatus calculated dari official materialization sebelum finalization');
      }

      const materializationRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.payroll_official_materializations
        WHERE tenant_id = ${tenantId} AND period_id = ${periodId}
        LIMIT 1
      `);
      const materialization = materializationRows[0];
      if (!materialization) throw new PayrollOfficialPostingError('OFFICIAL_MATERIALIZATION_REQUIRED', 'Materialization evidence tidak ditemukan');

      const runId = Number(materialization.calculation_run_id);
      const run = await loadRun(tx, tenantId, periodId, runId);
      assertPeriodKindMatchesRun(period, run);
      const activeProfile = await loadActiveTenantProfile(tx, tenantId, new Date(period.period_end));
      if (Number(activeProfile.id) !== Number(materialization.profile_id)) {
        throw new PayrollOfficialPostingError('ACTIVE_PROFILE_CHANGED_AFTER_MATERIALIZATION', 'Active payroll profile berubah setelah materialization; finalization ditolak');
      }

      const expectedRows = normalizeOfficialPayrollOutput(run.output_snapshot, run.tax_period_kind as 'non_final' | 'final');
      const totals = buildOfficialPayrollTotals(expectedRows);
      const persisted = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM accounting.payroll_details
        WHERE tenant_id = ${tenantId} AND period_id = ${periodId}
        ORDER BY employee_id ASC
      `);
      comparePersistedDetails(expectedRows, persisted, runId, Number(activeProfile.id));

      const settings = await loadAccountingSettings(tx, tenantId);
      const bpjsPayable = round2(totals.employeeStatutory + totals.employerStatutory);
      const journalLines: Array<{ accountId: number; description: string; debit: number; credit: number; normalBalance: string }> = [
        { accountId: Number(settings.salary_expense_account_id), description: 'Beban gaji payroll', debit: totals.cashGross, credit: 0, normalBalance: 'DEBIT' },
        { accountId: Number(settings.employer_statutory_expense_account_id), description: 'Beban kontribusi statutory employer', debit: totals.employerStatutory, credit: 0, normalBalance: 'DEBIT' },
        { accountId: Number(settings.salary_payable_account_id), description: 'Hutang gaji bersih', debit: 0, credit: totals.netSalary, normalBalance: 'CREDIT' },
        { accountId: Number(settings.pph21_payable_account_id), description: 'Hutang PPh 21', debit: 0, credit: totals.pph21Withholding, normalBalance: 'CREDIT' },
        { accountId: Number(settings.pph21_payable_account_id), description: 'Refund PPh 21 employee', debit: totals.pph21Refund, credit: 0, normalBalance: 'CREDIT' },
        { accountId: Number(settings.bpjs_payable_account_id), description: 'Hutang kontribusi BPJS/statutory', debit: 0, credit: bpjsPayable, normalBalance: 'CREDIT' },
      ].filter((line) => line.debit > 0 || line.credit > 0);

      const totalDebit = round2(journalLines.reduce((sum, line) => sum + line.debit, 0));
      const totalCredit = round2(journalLines.reduce((sum, line) => sum + line.credit, 0));
      if (Math.abs(totalDebit - totalCredit) > 0.01 || Math.abs(totalDebit - totals.totalDebit) > 0.01) {
        throw new PayrollOfficialPostingError('PAYROLL_JOURNAL_NOT_BALANCED', `Payroll journal tidak balance. Debit=${totalDebit}, Credit=${totalCredit}`);
      }

      const journalNumber = await nextPayrollJournalNumber(tx, tenantId, new Date(period.period_end).getUTCFullYear());
      const journal = await tx.journal_entries.create({
        data: {
          tenant_id: tenantId,
          outlet_id: null,
          journal_number: journalNumber,
          journal_type: 'payroll',
          transaction_date: period.pay_date ? new Date(period.pay_date) : new Date(period.period_end),
          description: `Official payroll period ${new Date(period.period_start).toISOString().slice(0, 10)} - ${new Date(period.period_end).toISOString().slice(0, 10)}`,
          reference_type: 'payroll_period',
          reference_id: periodId,
          total_debit: new Decimal(totalDebit),
          total_credit: new Decimal(totalCredit),
          status: 'draft',
          created_by: userId!,
          journal_entry_lines: {
            create: journalLines.map((line) => ({
              account_id: line.accountId,
              description: line.description,
              debit_amount: new Decimal(line.debit),
              credit_amount: new Decimal(line.credit),
            })),
          },
        },
        include: { journal_entry_lines: true },
      });

      for (const line of journal.journal_entry_lines) {
        const account = await tx.chart_of_accounts.findFirst({ where: { id: line.account_id, tenant_id: tenantId, is_active: true } });
        if (!account) throw new PayrollOfficialPostingError('PAYROLL_JOURNAL_ACCOUNT_INVALID', `Account ${line.account_id} tidak valid saat posting`);
        const last = await tx.general_ledger.findFirst({
          where: { tenant_id: tenantId, account_id: line.account_id },
          orderBy: [{ transaction_date: 'desc' }, { id: 'desc' }],
        });
        const previous = new Decimal(last?.balance || 0);
        const debit = new Decimal(line.debit_amount || 0);
        const credit = new Decimal(line.credit_amount || 0);
        const signed = account.normal_balance === 'DEBIT'
          ? previous.plus(debit).minus(credit)
          : previous.plus(credit).minus(debit);
        const balanceType = signed.isNegative()
          ? (account.normal_balance === 'DEBIT' ? 'CREDIT' : 'DEBIT')
          : account.normal_balance;
        await tx.general_ledger.create({
          data: {
            tenant_id: tenantId,
            outlet_id: null,
            account_id: line.account_id,
            journal_entry_id: journal.id,
            transaction_date: journal.transaction_date,
            description: line.description || journal.description,
            debit_amount: debit,
            credit_amount: credit,
            balance: signed.abs(),
            balance_type: balanceType,
          },
        });
      }

      await tx.journal_entries.update({
        where: { id: journal.id },
        data: { status: 'posted', posted_at: new Date(), posted_by: userId! },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE accounting.payroll_periods
        SET status = 'finalized', finalized_at = NOW(), finalized_by = ${userId ?? null}
        WHERE id = ${periodId} AND tenant_id = ${tenantId}
      `);

      const postings = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.payroll_official_postings
          (tenant_id, period_id, materialization_id, calculation_run_id, profile_id, profile_version,
           journal_entry_id, tax_period_kind, detail_count, totals, posted_by)
        VALUES
          (${tenantId}, ${periodId}, ${Number(materialization.id)}, ${runId}, ${Number(activeProfile.id)}, ${VERIFIED_PROFILE_VERSION},
           ${journal.id}, ${run.tax_period_kind}, ${expectedRows.length}, ${JSON.stringify(totals)}::jsonb, ${userId ?? null})
        RETURNING *
      `);
      return { posting: postings[0], journalId: journal.id, journalNumber, totals, idempotent: false };
    });

    res.status(result.idempotent ? 200 : 201).json({ success: true, data: result });
  } catch (error) {
    const handled = errorResponse(res, error);
    if (handled) return handled;
    next(error);
  }
};
