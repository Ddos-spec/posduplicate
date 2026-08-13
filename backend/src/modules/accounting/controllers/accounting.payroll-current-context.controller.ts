import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const PERIOD_CREATE_LOCK = 76002;

const parseDateOnly = (value: unknown, code: string) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error(`${code} harus berformat YYYY-MM-DD`), { status: 400, code });
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error(`${code} tidak valid`), { status: 400, code });
  }
  return parsed;
};

export const getPayrollCurrentContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const [employees, accounts] = await Promise.all([
      prisma.employees.findMany({
        where: { tenant_id: tenantId, status: 'active' },
        select: {
          id: true,
          employee_id: true,
          name: true,
          nik: true,
          ptkp_status: true,
          department: true,
          position: true,
          basic_salary: true,
          jkk_risk_level: true,
          bpjs_kesehatan: true,
          bpjs_ketenagakerjaan: true,
        },
        orderBy: { employee_id: 'asc' },
      }),
      prisma.chart_of_accounts.findMany({
        where: { tenant_id: tenantId, is_active: true, category: 'ACCOUNT' },
        select: {
          id: true,
          account_code: true,
          account_name: true,
          account_type: true,
          normal_balance: true,
          is_active: true,
        },
        orderBy: { account_code: 'asc' },
      }),
    ]);

    res.json({ success: true, data: { employees, accounts } });
  } catch (error) {
    next(error);
  }
};

export const createPayrollPeriodSafely = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId;
    const start = parseDateOnly(req.body.periodStart, 'INVALID_PERIOD_START');
    const end = parseDateOnly(req.body.periodEnd, 'INVALID_PERIOD_END');
    const payDate = req.body.payDate ? parseDateOnly(req.body.payDate, 'INVALID_PAY_DATE') : null;
    if (end < start) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PAYROLL_PERIOD_RANGE', message: 'periodEnd harus sama dengan atau setelah periodStart' } });
    }

    const description = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 500) : null;
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${PERIOD_CREATE_LOCK})`);
      const overlap = await tx.payroll_periods.findFirst({
        where: {
          tenant_id: tenantId,
          period_start: { lte: end },
          period_end: { gte: start },
        },
        select: { id: true, period_start: true, period_end: true },
      });
      if (overlap) {
        throw Object.assign(new Error('Periode payroll overlap dengan periode yang sudah ada'), { status: 409, code: 'PAYROLL_PERIOD_OVERLAP' });
      }
      return tx.payroll_periods.create({
        data: {
          tenant_id: tenantId,
          period_start: start,
          period_end: end,
          pay_date: payDate,
          description: description || null,
          status: 'draft',
          created_by: userId ?? null,
        },
      });
    });

    res.status(201).json({ success: true, data: created, message: 'Periode payroll berhasil dibuat' });
  } catch (error) {
    const candidate = error as { status?: number; code?: string; message?: string };
    if (candidate.status && candidate.code) {
      return res.status(candidate.status).json({ success: false, error: { code: candidate.code, message: candidate.message } });
    }
    next(error);
  }
};
