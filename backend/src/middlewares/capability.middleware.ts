import { NextFunction, Request, Response } from 'express';

export type SuiteCapability =
  | 'revenue.crm.read'
  | 'revenue.crm.manage'
  | 'revenue.sales.read'
  | 'revenue.sales.manage'
  | 'revenue.subscription.read'
  | 'revenue.subscription.manage'
  | 'revenue.rental.read'
  | 'revenue.rental.manage'
  | 'revenue.customer360.read'
  | 'revenue.loyalty.read'
  | 'revenue.loyalty.adjust'
  | 'supply.procurement.read'
  | 'supply.procurement.manage'
  | 'supply.warehouse.read'
  | 'supply.warehouse.manage'
  | 'supply.barcode.read'
  | 'supply.barcode.manage'
  | 'supply.manufacturing.read'
  | 'supply.manufacturing.manage'
  | 'supply.quality.read'
  | 'supply.quality.manage'
  | 'supply.maintenance.read'
  | 'supply.maintenance.manage'
  | 'workforce.employee.read'
  | 'workforce.employee.manage'
  | 'workforce.attendance.read'
  | 'workforce.attendance.manage'
  | 'workforce.attendance.self'
  | 'workforce.leave.read'
  | 'workforce.leave.manage'
  | 'workforce.leave.self'
  | 'workforce.recruitment.read'
  | 'workforce.recruitment.manage'
  | 'workforce.appraisal.read'
  | 'workforce.appraisal.manage'
  | 'workforce.appraisal.self'
  | 'workforce.payroll.read'
  | 'workforce.payroll.manage'
  | 'services.project.read'
  | 'services.project.manage'
  | 'services.timesheet.read'
  | 'services.timesheet.manage'
  | 'services.timesheet.self'
  | 'services.planning.read'
  | 'services.planning.manage'
  | 'services.field_service.read'
  | 'services.field_service.manage'
  | 'services.field_service.self'
  | 'services.helpdesk.read'
  | 'services.helpdesk.manage'
  | 'services.helpdesk.self'
  | 'services.appointment.read'
  | 'services.appointment.manage'
  | 'services.appointment.self'
  | 'digital.website.read'
  | 'digital.website.manage'
  | 'digital.commerce.read'
  | 'digital.commerce.manage'
  | 'digital.marketing.read'
  | 'digital.marketing.manage'
  | 'digital.learning.read'
  | 'digital.learning.manage'
  | 'digital.community.read'
  | 'digital.community.manage'
  | 'productivity.documents.read'
  | 'productivity.documents.manage'
  | 'productivity.knowledge.read'
  | 'productivity.knowledge.manage'
  | 'productivity.sign.read'
  | 'productivity.sign.manage';

type FeatureRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is FeatureRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ROLE_PRESETS: Record<string, SuiteCapability[] | '*'> = {
  'super admin': '*',
  super_admin: '*',
  admin: '*',
  owner: '*',
  manager: '*',
  accountant: [
    'revenue.sales.read',
    'revenue.subscription.read',
    'revenue.customer360.read',
    'revenue.loyalty.read',
    'supply.procurement.read',
    'supply.warehouse.read',
    'workforce.employee.read',
    'workforce.attendance.self',
    'workforce.leave.self',
    'workforce.appraisal.self',
    'workforce.payroll.read',
    'services.project.read',
    'services.timesheet.self',
  ],
  cashier: [
    'revenue.customer360.read',
    'revenue.loyalty.read',
    'workforce.attendance.self',
    'workforce.leave.self',
    'workforce.appraisal.self',
    'services.timesheet.self',
  ],
};

const getCapabilityOverrides = (req: Request): Record<string, boolean> => {
  const features = isRecord(req.tenant?.features) ? req.tenant.features : null;
  if (!features || !isRecord(features.capabilities)) return {};
  return Object.fromEntries(
    Object.entries(features.capabilities)
      .filter(([, value]) => typeof value === 'boolean')
      .map(([key, value]) => [key, Boolean(value)])
  );
};

export const hasCapability = (req: Request, capability: SuiteCapability) => {
  const overrides = getCapabilityOverrides(req);
  if (capability in overrides) return overrides[capability];

  const role = String(req.userRole || '').trim().toLowerCase();
  const preset = ROLE_PRESETS[role];
  if (preset === '*') return true;
  return Array.isArray(preset) && preset.includes(capability);
};

export const requireCapability = (capability: SuiteCapability) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!hasCapability(req, capability)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CAPABILITY_REQUIRED',
          message: `Action requires capability: ${capability}`,
          capability,
        },
      });
    }
    return next();
  };
