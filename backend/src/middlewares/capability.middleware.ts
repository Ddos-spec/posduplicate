import { NextFunction, Request, Response } from 'express';

export type SuiteCapability =
  | 'revenue.crm.read'
  | 'revenue.crm.manage'
  | 'revenue.sales.read'
  | 'revenue.sales.manage'
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
  | 'supply.maintenance.manage';

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
    'revenue.customer360.read',
    'revenue.loyalty.read',
    'supply.procurement.read',
    'supply.warehouse.read',
  ],
  cashier: [
    'revenue.customer360.read',
    'revenue.loyalty.read',
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
