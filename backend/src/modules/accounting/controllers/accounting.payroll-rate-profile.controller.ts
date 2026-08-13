import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  calculateBaseMonthlyTerPph21,
  PayrollRuleError,
  PPH21_BASE_RULESET,
} from '../services/payroll-current-law.p2';
import {
  calculatePpuStatutoryContributions,
  JkkRiskLevel,
  PPU_STATUTORY_RULESET,
  StatutoryContributionError,
} from '../services/payroll-statutory.p2';

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

export const getBaseMonthlyTerPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grossMonthly = Number(req.query.grossMonthly);
    const ptkpStatus = String(req.query.ptkpStatus || '');
    const result = calculateBaseMonthlyTerPph21(grossMonthly, ptkpStatus);
    res.json({
      success: true,
      data: {
        ...result,
        ruleset: PPH21_BASE_RULESET,
        complianceNotice: 'Preview ini hanya base TER untuk masa pajak selain masa pajak terakhir; DTP/stimulus, identity/NPWP treatment, BPJS, dan rekonsiliasi masa pajak terakhir belum diterapkan.',
      },
    });
  } catch (error) {
    if (error instanceof PayrollRuleError) {
      return res.status(400).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
};

const queryFlag = (value: unknown, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new StatutoryContributionError('INVALID_BOOLEAN_FLAG', `Flag boolean tidak valid: ${String(value)}`);
};

export const getPpuStatutoryPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportedFixedWage = Number(req.query.reportedFixedWage);
    const jkkRiskLevel = Number(req.query.jkkRiskLevel || 1) as JkkRiskLevel;
    const bpjsEmploymentEnabled = queryFlag(req.query.bpjsEmploymentEnabled, true);
    const bpjsHealthEnabled = queryFlag(req.query.bpjsHealthEnabled, true);
    const applicableHealthMinimumWage = req.query.applicableHealthMinimumWage === undefined
      ? undefined
      : Number(req.query.applicableHealthMinimumWage);

    const result = calculatePpuStatutoryContributions({
      reportedFixedWage,
      jkkRiskLevel,
      bpjsEmploymentEnabled,
      bpjsHealthEnabled,
      applicableHealthMinimumWage,
    });

    res.json({
      success: true,
      data: {
        ...result,
        ruleset: PPU_STATUTORY_RULESET,
        complianceNotice: 'Preview PPU memakai reported fixed wage; BPJS Kesehatan memerlukan UMK/UMP yang berlaku. Relief khusus BPU tidak diterapkan.',
      },
    });
  } catch (error) {
    if (error instanceof StatutoryContributionError) {
      return res.status(400).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    next(error);
  }
};

export const rejectLegacyPayrollMutation = (_req: Request, res: Response) => res.status(409).json({
  success: false,
  error: {
    code: 'CURRENT_PAYROLL_ENGINE_NOT_WIRED',
    message: 'Payroll calculate/finalize legacy diblokir sampai current-law rate profile, BPJS, dan engine PPh 21 terverifikasi terhubung end-to-end.',
  },
});
