import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

export const getPayrollRateProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, tenant_id, profile_code, version, country_code, effective_from, effective_to,
             status, tax_method, tax_rule_reference, configuration, source_references, notes,
             created_at, updated_at,
             CASE WHEN tenant_id = ${tenantId} THEN 'tenant' ELSE 'global' END AS scope
      FROM public.payroll_rate_profiles
      WHERE tenant_id = ${tenantId} OR tenant_id IS NULL
      ORDER BY CASE WHEN tenant_id = ${tenantId} THEN 0 ELSE 1 END,
               effective_from DESC, version DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getEffectivePayrollRateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const requestedDate = req.query.date ? new Date(String(req.query.date)) : new Date();
    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EFFECTIVE_DATE', message: 'Tanggal effective profile tidak valid' } });
    }
    const date = requestedDate.toISOString().slice(0, 10);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, tenant_id, profile_code, version, country_code, effective_from, effective_to,
             status, tax_method, tax_rule_reference, configuration, source_references, notes
      FROM public.payroll_rate_profiles
      WHERE (tenant_id = ${tenantId} OR tenant_id IS NULL)
        AND status = 'active'
        AND effective_from <= ${date}::date
        AND (effective_to IS NULL OR effective_to >= ${date}::date)
      ORDER BY CASE WHEN tenant_id = ${tenantId} THEN 0 ELSE 1 END,
               effective_from DESC, version DESC
      LIMIT 1
    `);
    if (!rows[0]) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'NO_ACTIVE_PAYROLL_RATE_PROFILE',
          message: 'Belum ada payroll rate profile aktif untuk tanggal tersebut. Kalkulasi legacy belum boleh dianggap current.',
        },
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
