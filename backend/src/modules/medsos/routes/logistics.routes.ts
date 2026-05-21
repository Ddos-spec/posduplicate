import { Router, type Request, type Response, type NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  buildAutomationToolDescriptor,
  calculateDomesticShippingCost,
  getManagedLogisticsStatus,
  normalizeLogisticsAssistantSettings,
  searchDomesticDestinations,
  trackWaybill,
} from '../services/logisticsAssistant.service';

interface AuthRequest extends Request {
  tenantId?: number;
}

const router = Router();

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getTenantLogisticsSettings = async (tenantId: number) => {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      business_name: true,
      settings: true,
    },
  });

  if (!tenant) {
    const error = new Error('Tenant tidak ditemukan.');
    (error as any).statusCode = 404;
    throw error;
  }

  const settingsData = isPlainObject(tenant.settings) ? tenant.settings : {};
  const workspaceRoot = isPlainObject((settingsData as any).myCommerSocialSettings)
    ? (settingsData as any).myCommerSocialSettings
    : {};

  return {
    tenantId: tenant.id,
    businessName: tenant.business_name,
    settings: normalizeLogisticsAssistantSettings((workspaceRoot as any).logisticsAssistant),
  };
};

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof Error) {
    const statusCode = Number((error as any).statusCode) || 500;
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({
        success: false,
        error: {
          code: 'LOGISTICS_VALIDATION_ERROR',
          message: error.message,
        },
      });
    }
  }

  return next(error);
};

router.post('/assistant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.body?.tenantId);
    const action = String(req.body?.action || '').trim().toLowerCase();
    const token = String(req.headers['x-mcs-logistics-token'] || '').trim();

    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'tenantId wajib dikirim untuk automation logistics assistant.',
        },
      });
    }

    const tenantContext = await getTenantLogisticsSettings(tenantId);
    if (!tenantContext.settings.active) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'LOGISTICS_ASSISTANT_INACTIVE',
          message: 'Logistics assistant belum diaktifkan untuk tenant ini.',
        },
      });
    }

    if (!tenantContext.settings.automationToken || token !== tenantContext.settings.automationToken) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_AUTOMATION_TOKEN',
          message: 'Token automation logistics tidak valid.',
        },
      });
    }

    const payload = isPlainObject(req.body?.payload) ? req.body.payload : {};

    if (action === 'cost') {
      if (!tenantContext.settings.shippingCostEnabled) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SHIPPING_COST_DISABLED',
            message: 'Fitur cek ongkir belum aktif untuk tenant ini.',
          },
        });
      }

      const result = await calculateDomesticShippingCost({
        ...payload,
        tenantDefaults: tenantContext.settings,
      });

      return res.json({
        success: true,
        data: {
          action: 'cost',
          provider: 'rajaongkir',
          tenantId,
          businessName: tenantContext.businessName,
          ...result,
        },
      });
    }

    if (action === 'track') {
      if (!tenantContext.settings.trackingEnabled) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'TRACKING_DISABLED',
            message: 'Fitur cek resi belum aktif untuk tenant ini.',
          },
        });
      }

      const result = await trackWaybill({
        awb: payload.awb,
        courier: payload.courier,
        lastPhoneNumber: payload.lastPhoneNumber,
      });

      return res.json({
        success: true,
        data: {
          action: 'track',
          provider: 'rajaongkir',
          tenantId,
          businessName: tenantContext.businessName,
          ...result,
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: 'ACTION_REQUIRED',
        message: 'action harus bernilai "cost" atau "track".',
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/status', async (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    data: getManagedLogisticsStatus(),
  });
});

router.post('/search-destination', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = String(_req.body?.search || '').trim();
    const limit = Number(_req.body?.limit) || 10;
    const offset = Number(_req.body?.offset) || 0;
    const results = await searchDomesticDestinations(search, limit, offset);
    return res.json({
      success: true,
      data: {
        search,
        count: results.length,
        results,
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.post('/cost', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant context wajib ada.',
        },
      });
    }

    const tenantContext = await getTenantLogisticsSettings(tenantId);
    const result = await calculateDomesticShippingCost({
      ...req.body,
      tenantDefaults: tenantContext.settings,
    });

    return res.json({
      success: true,
      data: {
        action: 'cost',
        provider: 'rajaongkir',
        tenantId,
        businessName: tenantContext.businessName,
        ...result,
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.post('/track', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await trackWaybill({
      awb: _req.body?.awb,
      courier: _req.body?.courier,
      lastPhoneNumber: _req.body?.lastPhoneNumber,
    });

    return res.json({
      success: true,
      data: {
        action: 'track',
        provider: 'rajaongkir',
        ...result,
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.get('/tool-descriptor', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant context wajib ada.',
        },
      });
    }

    const tenantContext = await getTenantLogisticsSettings(tenantId);
    return res.json({
      success: true,
      data: buildAutomationToolDescriptor(tenantId, tenantContext.settings),
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

export default router;
