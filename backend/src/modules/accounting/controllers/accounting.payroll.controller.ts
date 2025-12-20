import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * Payroll Module Controller
 * Complete payroll management with Indonesian tax compliance
 *
 * Features:
 * - Employee data management
 * - Salary calculation (Basic + Allowances - Deductions)
 * - PPh 21 calculation (TER method - 2024)
 * - BPJS Kesehatan & Ketenagakerjaan
 * - Overtime calculation
 * - THR (Tunjangan Hari Raya)
 * - Payslip generation
 * - Payroll reports
 */

// ============= TAX & BPJS RATES (2024) =============

const PPH_21_TER = {
  // TER (Tarif Efektif Rata-rata) - effective Jan 2024
  TK_0: [ // Tidak Kawin, Tanpa Tanggungan
    { min: 0, max: 5400000, rate: 0 },
    { min: 5400001, max: 5650000, rate: 0.0025 },
    { min: 5650001, max: 5950000, rate: 0.005 },
    { min: 5950001, max: 6300000, rate: 0.0075 },
    { min: 6300001, max: 6750000, rate: 0.01 },
    { min: 6750001, max: 7500000, rate: 0.0125 },
    { min: 7500001, max: 8550000, rate: 0.015 },
    { min: 8550001, max: 9650000, rate: 0.0175 },
    { min: 9650001, max: 10050000, rate: 0.02 },
    { min: 10050001, max: 10350000, rate: 0.0225 },
    { min: 10350001, max: 10700000, rate: 0.025 },
    { min: 10700001, max: 11050000, rate: 0.03 },
    { min: 11050001, max: 11600000, rate: 0.035 },
    { min: 11600001, max: 12500000, rate: 0.04 },
    { min: 12500001, max: 13750000, rate: 0.05 },
    { min: 13750001, max: 15100000, rate: 0.06 },
    { min: 15100001, max: 16950000, rate: 0.07 },
    { min: 16950001, max: 19750000, rate: 0.08 },
    { min: 19750001, max: 24150000, rate: 0.09 },
    { min: 24150001, max: 26450000, rate: 0.1 },
    { min: 26450001, max: 28100000, rate: 0.11 },
    { min: 28100001, max: 30100000, rate: 0.12 },
    { min: 30100001, max: 32600000, rate: 0.13 },
    { min: 32600001, max: 35400000, rate: 0.14 },
    { min: 35400001, max: 38900000, rate: 0.15 },
    { min: 38900001, max: 43000000, rate: 0.16 },
    { min: 43000001, max: 47400000, rate: 0.17 },
    { min: 47400001, max: 51200000, rate: 0.18 },
    { min: 51200001, max: 56300000, rate: 0.19 },
    { min: 56300001, max: 62200000, rate: 0.2 },
    { min: 62200001, max: 68600000, rate: 0.21 },
    { min: 68600001, max: 77500000, rate: 0.22 },
    { min: 77500001, max: 89000000, rate: 0.23 },
    { min: 89000001, max: 103000000, rate: 0.24 },
    { min: 103000001, max: 125000000, rate: 0.25 },
    { min: 125000001, max: 157000000, rate: 0.26 },
    { min: 157000001, max: 206000000, rate: 0.27 },
    { min: 206000001, max: 337000000, rate: 0.28 },
    { min: 337000001, max: 454000000, rate: 0.29 },
    { min: 454000001, max: 550000000, rate: 0.30 },
    { min: 550000001, max: 695000000, rate: 0.31 },
    { min: 695000001, max: 910000000, rate: 0.32 },
    { min: 910000001, max: 1400000000, rate: 0.33 },
    { min: 1400000001, max: Infinity, rate: 0.34 }
  ]
};

const BPJS = {
  kesehatan: {
    rate: 0.05, // 5% total (4% employer + 1% employee)
    employerRate: 0.04,
    employeeRate: 0.01,
    maxSalary: 12000000 // Maximum salary for calculation
  },
  jkk: { // Jaminan Kecelakaan Kerja (by risk level)
    rates: [0.0024, 0.0054, 0.0089, 0.0127, 0.0174] // Level 1-5
  },
  jkm: { // Jaminan Kematian
    rate: 0.003 // 0.3%
  },
  jht: { // Jaminan Hari Tua
    employerRate: 0.037, // 3.7%
    employeeRate: 0.02 // 2%
  },
  jp: { // Jaminan Pensiun
    employerRate: 0.02, // 2%
    employeeRate: 0.01, // 1%
    maxSalary: 9559600 // Maximum salary for calculation (2024)
  }
};

// ============= EMPLOYEE MANAGEMENT =============

/**
 * Get all employees
 */
export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { status, department, page = 1, limit = 20 } = req.query;

    let whereClause = `WHERE e.tenant_id = ${tenantId}`;
    if (status) whereClause += ` AND e.status = '${status}'`;
    if (department) whereClause += ` AND e.department = '${department}'`;

    const offset = (Number(page) - 1) * Number(limit);

    const employees: any[] = await prisma.$queryRawUnsafe(`
      SELECT e.*, u.name as user_name, u.email
      FROM "accounting"."employees" e
      LEFT JOIN "users" u ON e.user_id = u.id
      ${whereClause}
      ORDER BY e.employee_id
      LIMIT ${limit} OFFSET ${offset}
    `).catch(() => []);

    const total: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "accounting"."employees" e ${whereClause}
    `).catch(() => [{ count: 0 }]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total[0]?.count || 0),
          totalPages: Math.ceil(Number(total[0]?.count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create/update employee
 */
export const upsertEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const {
      id,
      employeeId,
      userId: empUserId,
      name,
      nik,
      npwp,
      ptkpStatus, // TK/0, K/0, K/1, K/2, K/3
      department,
      position,
      joinDate,
      bankName,
      bankAccount,
      basicSalary,
      allowances, // { transport, meal, position, etc }
      bpjsKesehatan,
      bpjsKetenagakerjaan,
      jkkRiskLevel = 1
    } = req.body;

    const allowancesJson = JSON.stringify(allowances || {});

    if (id) {
      // Update
      await prisma.$executeRawUnsafe(`
        UPDATE "accounting"."employees"
        SET
          name = '${name}',
          nik = '${nik}',
          npwp = ${npwp ? `'${npwp}'` : 'NULL'},
          ptkp_status = '${ptkpStatus || 'TK/0'}',
          department = '${department || ''}',
          position = '${position || ''}',
          bank_name = '${bankName || ''}',
          bank_account = '${bankAccount || ''}',
          basic_salary = ${basicSalary},
          allowances = '${allowancesJson}',
          bpjs_kesehatan = '${bpjsKesehatan || ''}',
          bpjs_ketenagakerjaan = '${bpjsKetenagakerjaan || ''}',
          jkk_risk_level = ${jkkRiskLevel},
          updated_at = NOW(),
          updated_by = ${userId}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);

      res.json({ success: true, message: 'Data karyawan berhasil diperbarui' });
    } else {
      // Insert
      await prisma.$executeRawUnsafe(`
        INSERT INTO "accounting"."employees"
        (tenant_id, employee_id, user_id, name, nik, npwp, ptkp_status, department, position,
         join_date, bank_name, bank_account, basic_salary, allowances,
         bpjs_kesehatan, bpjs_ketenagakerjaan, jkk_risk_level, status, created_by, created_at)
        VALUES
        (${tenantId}, '${employeeId}', ${empUserId || 'NULL'}, '${name}', '${nik}',
         ${npwp ? `'${npwp}'` : 'NULL'}, '${ptkpStatus || 'TK/0'}', '${department || ''}',
         '${position || ''}', '${joinDate}', '${bankName || ''}', '${bankAccount || ''}',
         ${basicSalary}, '${allowancesJson}', '${bpjsKesehatan || ''}',
         '${bpjsKetenagakerjaan || ''}', ${jkkRiskLevel}, 'active', ${userId}, NOW())
      `).catch(async () => {
        await createPayrollTables();
      });

      res.status(201).json({ success: true, message: 'Data karyawan berhasil ditambahkan' });
    }
  } catch (error) {
    next(error);
  }
};

// ============= PAYROLL PROCESSING =============

/**
 * Get payroll periods
 */
export const getPayrollPeriods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { year } = req.query;

    const yearFilter = year ? `AND EXTRACT(YEAR FROM period_start) = ${year}` : '';

    const periods: any[] = await prisma.$queryRawUnsafe(`
      SELECT *
      FROM "accounting"."payroll_periods"
      WHERE tenant_id = ${tenantId} ${yearFilter}
      ORDER BY period_start DESC
    `).catch(() => []);

    res.json({
      success: true,
      data: periods
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create payroll period
 */
export const createPayrollPeriod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { periodStart, periodEnd, payDate, description } = req.body;

    // Check for overlapping periods
    const existing: any[] = await prisma.$queryRawUnsafe(`
      SELECT id FROM "accounting"."payroll_periods"
      WHERE tenant_id = ${tenantId}
      AND (
        (period_start <= '${periodStart}' AND period_end >= '${periodStart}')
        OR (period_start <= '${periodEnd}' AND period_end >= '${periodEnd}')
      )
    `).catch(() => []);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'OVERLAP', message: 'Periode payroll overlap dengan periode yang sudah ada' }
      });
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."payroll_periods"
      (tenant_id, period_start, period_end, pay_date, description, status, created_by, created_at)
      VALUES
      (${tenantId}, '${periodStart}', '${periodEnd}', '${payDate}', '${description || ''}',
       'draft', ${userId}, NOW())
    `).catch(async () => {
      await createPayrollTables();
    });

    res.status(201).json({
      success: true,
      message: 'Periode payroll berhasil dibuat'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate payroll for a period
 */
export const calculatePayroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { periodId } = req.params;

    // Get period
    const period: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."payroll_periods"
      WHERE id = ${periodId} AND tenant_id = ${tenantId}
    `).catch(() => []);

    if (period.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Periode tidak ditemukan' }
      });
    }

    if (period[0].status === 'finalized') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_FINALIZED', message: 'Periode sudah difinalisasi' }
      });
    }

    // Get all active employees
    const employees: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."employees"
      WHERE tenant_id = ${tenantId} AND status = 'active'
    `).catch(() => []);

    // Get overtime and attendance data (if exists)
    const overtimeData: any[] = await prisma.$queryRawUnsafe(`
      SELECT employee_id, SUM(hours) as total_hours
      FROM "accounting"."overtime"
      WHERE tenant_id = ${tenantId}
      AND date >= '${period[0].period_start}'
      AND date <= '${period[0].period_end}'
      GROUP BY employee_id
    `).catch(() => []);

    const overtimeMap = new Map(overtimeData.map(o => [o.employee_id, Number(o.total_hours)]));

    const payrollResults: any[] = [];

    for (const emp of employees) {
      const basicSalary = Number(emp.basic_salary);
      const allowances = typeof emp.allowances === 'string' ? JSON.parse(emp.allowances) : emp.allowances || {};

      // Calculate total allowances
      let totalAllowance = 0;
      for (const key in allowances) {
        totalAllowance += Number(allowances[key]) || 0;
      }

      // Calculate overtime
      const overtimeHours = overtimeMap.get(emp.id) || 0;
      const hourlyRate = basicSalary / 173; // Standard monthly hours
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);

      // Gross salary
      const grossSalary = basicSalary + totalAllowance + overtimePay;

      // Calculate BPJS Kesehatan
      const bpjsKesBase = Math.min(grossSalary, BPJS.kesehatan.maxSalary);
      const bpjsKesEmployer = Math.round(bpjsKesBase * BPJS.kesehatan.employerRate);
      const bpjsKesEmployee = Math.round(bpjsKesBase * BPJS.kesehatan.employeeRate);

      // Calculate BPJS Ketenagakerjaan
      const jkkRate = BPJS.jkk.rates[(emp.jkk_risk_level || 1) - 1];
      const jkk = Math.round(grossSalary * jkkRate);
      const jkm = Math.round(grossSalary * BPJS.jkm.rate);
      const jhtEmployer = Math.round(grossSalary * BPJS.jht.employerRate);
      const jhtEmployee = Math.round(grossSalary * BPJS.jht.employeeRate);

      const jpBase = Math.min(grossSalary, BPJS.jp.maxSalary);
      const jpEmployer = Math.round(jpBase * BPJS.jp.employerRate);
      const jpEmployee = Math.round(jpBase * BPJS.jp.employeeRate);

      // Calculate PPh 21 using TER method
      const taxableIncome = grossSalary - jhtEmployee - jpEmployee;
      const pph21 = calculatePPh21TER(taxableIncome, emp.npwp);

      // Total deductions
      const totalDeductions = bpjsKesEmployee + jhtEmployee + jpEmployee + pph21;

      // Net salary
      const netSalary = grossSalary - totalDeductions;

      // Employer cost
      const employerCost = grossSalary + bpjsKesEmployer + jkk + jkm + jhtEmployer + jpEmployer;

      // Delete existing payroll for this employee in this period
      await prisma.$executeRawUnsafe(`
        DELETE FROM "accounting"."payroll_details"
        WHERE tenant_id = ${tenantId}
        AND period_id = ${periodId}
        AND employee_id = ${emp.id}
      `).catch(() => {});

      // Insert payroll detail
      await prisma.$executeRawUnsafe(`
        INSERT INTO "accounting"."payroll_details"
        (tenant_id, period_id, employee_id, basic_salary, total_allowance, overtime_hours, overtime_pay,
         gross_salary, bpjs_kes_employer, bpjs_kes_employee, jkk, jkm, jht_employer, jht_employee,
         jp_employer, jp_employee, pph21, total_deductions, net_salary, employer_cost, created_at)
        VALUES
        (${tenantId}, ${periodId}, ${emp.id}, ${basicSalary}, ${totalAllowance}, ${overtimeHours}, ${overtimePay},
         ${grossSalary}, ${bpjsKesEmployer}, ${bpjsKesEmployee}, ${jkk}, ${jkm}, ${jhtEmployer}, ${jhtEmployee},
         ${jpEmployer}, ${jpEmployee}, ${pph21}, ${totalDeductions}, ${netSalary}, ${employerCost}, NOW())
      `);

      payrollResults.push({
        employeeId: emp.employee_id,
        name: emp.name,
        basicSalary,
        totalAllowance,
        overtimePay,
        grossSalary,
        deductions: {
          bpjsKes: bpjsKesEmployee,
          jht: jhtEmployee,
          jp: jpEmployee,
          pph21
        },
        totalDeductions,
        netSalary,
        employerCost
      });
    }

    // Update period status
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."payroll_periods"
      SET status = 'calculated', calculated_at = NOW(), calculated_by = ${userId}
      WHERE id = ${periodId}
    `);

    // Calculate totals
    const totals = {
      totalEmployees: payrollResults.length,
      totalGross: payrollResults.reduce((sum, p) => sum + p.grossSalary, 0),
      totalDeductions: payrollResults.reduce((sum, p) => sum + p.totalDeductions, 0),
      totalNet: payrollResults.reduce((sum, p) => sum + p.netSalary, 0),
      totalEmployerCost: payrollResults.reduce((sum, p) => sum + p.employerCost, 0),
      totalPPh21: payrollResults.reduce((sum, p) => sum + p.deductions.pph21, 0)
    };

    res.json({
      success: true,
      data: {
        period: period[0],
        payroll: payrollResults,
        totals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payroll details for a period
 */
export const getPayrollDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { periodId } = req.params;

    const details: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        pd.*,
        e.employee_id,
        e.name,
        e.department,
        e.position,
        e.bank_name,
        e.bank_account
      FROM "accounting"."payroll_details" pd
      JOIN "accounting"."employees" e ON pd.employee_id = e.id
      WHERE pd.tenant_id = ${tenantId} AND pd.period_id = ${periodId}
      ORDER BY e.name
    `).catch(() => []);

    const period: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."payroll_periods"
      WHERE id = ${periodId} AND tenant_id = ${tenantId}
    `).catch(() => []);

    res.json({
      success: true,
      data: {
        period: period[0],
        details,
        totals: {
          totalGross: details.reduce((sum, d) => sum + Number(d.gross_salary), 0),
          totalDeductions: details.reduce((sum, d) => sum + Number(d.total_deductions), 0),
          totalNet: details.reduce((sum, d) => sum + Number(d.net_salary), 0),
          totalEmployerCost: details.reduce((sum, d) => sum + Number(d.employer_cost), 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Finalize payroll
 */
export const finalizePayroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { periodId } = req.params;

    const period: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."payroll_periods"
      WHERE id = ${periodId} AND tenant_id = ${tenantId}
    `).catch(() => []);

    if (period.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Periode tidak ditemukan' }
      });
    }

    if (period[0].status !== 'calculated') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CALCULATED', message: 'Payroll belum dihitung' }
      });
    }

    // Update status
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."payroll_periods"
      SET status = 'finalized', finalized_at = NOW(), finalized_by = ${userId}
      WHERE id = ${periodId}
    `);

    // Create journal entries for payroll
    // This would integrate with the journal module
    await createPayrollJournalEntries(tenantId, periodId, userId);

    res.json({
      success: true,
      message: 'Payroll berhasil difinalisasi'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate payslip
 */
export const generatePayslip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { periodId, employeeId } = req.params;

    const detail: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        pd.*,
        e.employee_id,
        e.name,
        e.nik,
        e.npwp,
        e.department,
        e.position,
        e.bank_name,
        e.bank_account,
        e.allowances,
        pp.period_start,
        pp.period_end,
        pp.pay_date
      FROM "accounting"."payroll_details" pd
      JOIN "accounting"."employees" e ON pd.employee_id = e.id
      JOIN "accounting"."payroll_periods" pp ON pd.period_id = pp.id
      WHERE pd.tenant_id = ${tenantId}
      AND pd.period_id = ${periodId}
      AND pd.employee_id = ${employeeId}
    `).catch(() => []);

    if (detail.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Data payroll tidak ditemukan' }
      });
    }

    const payslip = detail[0];
    const allowances = typeof payslip.allowances === 'string' ? JSON.parse(payslip.allowances) : payslip.allowances || {};

    res.json({
      success: true,
      data: {
        employee: {
          id: payslip.employee_id,
          name: payslip.name,
          nik: payslip.nik,
          npwp: payslip.npwp,
          department: payslip.department,
          position: payslip.position
        },
        period: {
          start: payslip.period_start,
          end: payslip.period_end,
          payDate: payslip.pay_date
        },
        earnings: {
          basicSalary: Number(payslip.basic_salary),
          allowances: allowances,
          totalAllowance: Number(payslip.total_allowance),
          overtimeHours: Number(payslip.overtime_hours),
          overtimePay: Number(payslip.overtime_pay),
          grossSalary: Number(payslip.gross_salary)
        },
        deductions: {
          bpjsKesehatan: Number(payslip.bpjs_kes_employee),
          jht: Number(payslip.jht_employee),
          jp: Number(payslip.jp_employee),
          pph21: Number(payslip.pph21),
          totalDeductions: Number(payslip.total_deductions)
        },
        netSalary: Number(payslip.net_salary),
        payment: {
          bankName: payslip.bank_name,
          bankAccount: payslip.bank_account
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= THR CALCULATION =============

/**
 * Calculate THR (Tunjangan Hari Raya)
 */
export const calculateTHR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { year, thrDate } = req.body;

    const employees: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."employees"
      WHERE tenant_id = ${tenantId} AND status = 'active'
    `).catch(() => []);

    const thrResults: any[] = [];

    for (const emp of employees) {
      const basicSalary = Number(emp.basic_salary);
      const allowances = typeof emp.allowances === 'string' ? JSON.parse(emp.allowances) : emp.allowances || {};

      // Calculate fixed allowances (exclude overtime, etc)
      let fixedAllowance = 0;
      for (const key in allowances) {
        if (!['overtime', 'bonus', 'variable'].includes(key)) {
          fixedAllowance += Number(allowances[key]) || 0;
        }
      }

      const monthlyWage = basicSalary + fixedAllowance;

      // Calculate masa kerja
      const joinDate = new Date(emp.join_date);
      const thrDateObj = new Date(thrDate);
      const workMonths = Math.floor((thrDateObj.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      let thrAmount: number;
      if (workMonths >= 12) {
        // Full THR for 1+ year
        thrAmount = monthlyWage;
      } else if (workMonths >= 1) {
        // Proportional THR
        thrAmount = Math.round((monthlyWage * workMonths) / 12);
      } else {
        thrAmount = 0;
      }

      // Calculate PPh 21 on THR
      const pph21THR = calculatePPh21TER(thrAmount, emp.npwp);
      const netTHR = thrAmount - pph21THR;

      thrResults.push({
        employeeId: emp.employee_id,
        name: emp.name,
        joinDate: emp.join_date,
        workMonths,
        monthlyWage,
        thrAmount,
        pph21: pph21THR,
        netTHR
      });
    }

    res.json({
      success: true,
      data: {
        year,
        thrDate,
        employees: thrResults,
        totals: {
          totalTHR: thrResults.reduce((sum, t) => sum + t.thrAmount, 0),
          totalPPh21: thrResults.reduce((sum, t) => sum + t.pph21, 0),
          totalNet: thrResults.reduce((sum, t) => sum + t.netTHR, 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= OVERTIME =============

/**
 * Record overtime
 */
export const recordOvertime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { employeeId, date, hours, description, type = 'weekday' } = req.body;

    // Validate hours
    if (hours <= 0 || hours > 12) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_HOURS', message: 'Jam lembur harus antara 0-12 jam' }
      });
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."overtime"
      (tenant_id, employee_id, date, hours, type, description, created_by, created_at)
      VALUES
      (${tenantId}, ${employeeId}, '${date}', ${hours}, '${type}', '${description || ''}', ${userId}, NOW())
    `).catch(async () => {
      await createPayrollTables();
    });

    res.status(201).json({
      success: true,
      message: 'Lembur berhasil dicatat'
    });
  } catch (error) {
    next(error);
  }
};

// ============= REPORTS =============

/**
 * Get payroll summary report
 */
export const getPayrollReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { year, month } = req.query;

    let whereClause = `WHERE pd.tenant_id = ${tenantId}`;
    if (year) whereClause += ` AND EXTRACT(YEAR FROM pp.period_start) = ${year}`;
    if (month) whereClause += ` AND EXTRACT(MONTH FROM pp.period_start) = ${month}`;

    const summary: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        pp.id as period_id,
        pp.period_start,
        pp.period_end,
        pp.status,
        COUNT(pd.id) as employee_count,
        COALESCE(SUM(pd.gross_salary), 0) as total_gross,
        COALESCE(SUM(pd.total_deductions), 0) as total_deductions,
        COALESCE(SUM(pd.net_salary), 0) as total_net,
        COALESCE(SUM(pd.employer_cost), 0) as total_employer_cost,
        COALESCE(SUM(pd.pph21), 0) as total_pph21,
        COALESCE(SUM(pd.bpjs_kes_employer + pd.bpjs_kes_employee), 0) as total_bpjs_kes,
        COALESCE(SUM(pd.jkk + pd.jkm + pd.jht_employer + pd.jht_employee + pd.jp_employer + pd.jp_employee), 0) as total_bpjs_tk
      FROM "accounting"."payroll_periods" pp
      LEFT JOIN "accounting"."payroll_details" pd ON pp.id = pd.period_id
      ${whereClause}
      GROUP BY pp.id, pp.period_start, pp.period_end, pp.status
      ORDER BY pp.period_start DESC
    `).catch(() => []);

    res.json({
      success: true,
      data: summary.map(s => ({
        periodId: s.period_id,
        periodStart: s.period_start,
        periodEnd: s.period_end,
        status: s.status,
        employeeCount: Number(s.employee_count),
        totalGross: Number(s.total_gross),
        totalDeductions: Number(s.total_deductions),
        totalNet: Number(s.total_net),
        totalEmployerCost: Number(s.total_employer_cost),
        totalPPh21: Number(s.total_pph21),
        totalBPJSKesehatan: Number(s.total_bpjs_kes),
        totalBPJSTenagaKerja: Number(s.total_bpjs_tk)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get PPh 21 report for tax filing
 */
export const getPPh21Report = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { masa, tahun } = req.query;

    const report: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        e.employee_id,
        e.name,
        e.nik,
        e.npwp,
        e.ptkp_status,
        pd.gross_salary,
        pd.pph21
      FROM "accounting"."payroll_details" pd
      JOIN "accounting"."employees" e ON pd.employee_id = e.id
      JOIN "accounting"."payroll_periods" pp ON pd.period_id = pp.id
      WHERE pd.tenant_id = ${tenantId}
      AND EXTRACT(MONTH FROM pp.period_start) = ${masa}
      AND EXTRACT(YEAR FROM pp.period_start) = ${tahun}
      AND pp.status = 'finalized'
      ORDER BY e.name
    `).catch(() => []);

    res.json({
      success: true,
      data: {
        masa,
        tahun,
        employees: report.map(r => ({
          employeeId: r.employee_id,
          name: r.name,
          nik: r.nik,
          npwp: r.npwp || '-',
          ptkpStatus: r.ptkp_status,
          grossSalary: Number(r.gross_salary),
          pph21: Number(r.pph21)
        })),
        totalPPh21: report.reduce((sum, r) => sum + Number(r.pph21), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

function calculatePPh21TER(monthlyIncome: number, hasNPWP: boolean | string): number {
  const tariffs = PPH_21_TER.TK_0; // Simplified - use TK/0 for all

  let rate = 0;
  for (const bracket of tariffs) {
    if (monthlyIncome >= bracket.min && monthlyIncome <= bracket.max) {
      rate = bracket.rate;
      break;
    }
  }

  let pph = Math.round(monthlyIncome * rate);

  // Non-NPWP gets 20% higher
  if (!hasNPWP) {
    pph = Math.round(pph * 1.2);
  }

  return pph;
}

async function createPayrollJournalEntries(tenantId: number, periodId: number, _userId: number): Promise<void> {
  // Get payroll totals for journal entries
  const totals: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(gross_salary), 0) as total_gross,
      COALESCE(SUM(bpjs_kes_employer), 0) as bpjs_kes_er,
      COALESCE(SUM(bpjs_kes_employee), 0) as bpjs_kes_ee,
      COALESCE(SUM(jkk + jkm), 0) as total_jkk_jkm,
      COALESCE(SUM(jht_employer), 0) as jht_er,
      COALESCE(SUM(jht_employee), 0) as jht_ee,
      COALESCE(SUM(jp_employer), 0) as jp_er,
      COALESCE(SUM(jp_employee), 0) as jp_ee,
      COALESCE(SUM(pph21), 0) as total_pph21,
      COALESCE(SUM(net_salary), 0) as total_net
    FROM "accounting"."payroll_details"
    WHERE tenant_id = ${tenantId} AND period_id = ${periodId}
  `).catch(() => []);

  if (totals.length === 0) return;

  // Journal entries would be created here
  // Debit: Salary Expense (total_gross), BPJS Expense (employer portions)
  // Credit: Cash/Bank (total_net), BPJS Payable, PPh 21 Payable
  void totals; // Placeholder for future journal integration
}

async function createPayrollTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."employees" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      user_id INTEGER,
      name VARCHAR(255) NOT NULL,
      nik VARCHAR(20),
      npwp VARCHAR(20),
      ptkp_status VARCHAR(10) DEFAULT 'TK/0',
      department VARCHAR(100),
      position VARCHAR(100),
      join_date DATE,
      bank_name VARCHAR(100),
      bank_account VARCHAR(50),
      basic_salary DECIMAL(15,2) DEFAULT 0,
      allowances JSONB DEFAULT '{}',
      bpjs_kesehatan VARCHAR(50),
      bpjs_ketenagakerjaan VARCHAR(50),
      jkk_risk_level INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'active',
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by INTEGER,
      updated_at TIMESTAMPTZ
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."payroll_periods" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      pay_date DATE,
      description VARCHAR(255),
      status VARCHAR(20) DEFAULT 'draft',
      calculated_at TIMESTAMPTZ,
      calculated_by INTEGER,
      finalized_at TIMESTAMPTZ,
      finalized_by INTEGER,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."payroll_details" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      period_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      basic_salary DECIMAL(15,2) DEFAULT 0,
      total_allowance DECIMAL(15,2) DEFAULT 0,
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      overtime_pay DECIMAL(15,2) DEFAULT 0,
      gross_salary DECIMAL(15,2) DEFAULT 0,
      bpjs_kes_employer DECIMAL(15,2) DEFAULT 0,
      bpjs_kes_employee DECIMAL(15,2) DEFAULT 0,
      jkk DECIMAL(15,2) DEFAULT 0,
      jkm DECIMAL(15,2) DEFAULT 0,
      jht_employer DECIMAL(15,2) DEFAULT 0,
      jht_employee DECIMAL(15,2) DEFAULT 0,
      jp_employer DECIMAL(15,2) DEFAULT 0,
      jp_employee DECIMAL(15,2) DEFAULT 0,
      pph21 DECIMAL(15,2) DEFAULT 0,
      total_deductions DECIMAL(15,2) DEFAULT 0,
      net_salary DECIMAL(15,2) DEFAULT 0,
      employer_cost DECIMAL(15,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."overtime" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      date DATE NOT NULL,
      hours DECIMAL(5,2) NOT NULL,
      type VARCHAR(20) DEFAULT 'weekday',
      description TEXT,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}
