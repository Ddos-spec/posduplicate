import { Request, Response, NextFunction } from 'express';
import {
  beginManagedIntegrationConnect,
  completeManagedIntegrationConnect,
  disconnectManagedIntegration,
  getManagedIntegrationDetail,
  getManagedIntegrationHub,
  handleManagedIntegrationCallback,
  handleManagedIntegrationWebhook,
  proxySocialHubStats,
  syncManagedIntegration,
  type ManagedAssetInput,
} from '../services/integrationHub.service';

function parseSelectedAssets(input: unknown): ManagedAssetInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<ManagedAssetInput[]>((accumulator, item, index) => {
      if (!item || typeof item !== 'object') {
        return accumulator;
      }

      const record = item as Record<string, unknown>;
      const label = String(record.label || record.name || '').trim();
      const kind = String(record.kind || record.type || '').trim();

      if (!label || !kind) {
        return accumulator;
      }

      accumulator.push({
        id: String(record.id || `${kind}-${index + 1}`),
        label,
        kind,
        status: String(record.status || 'connected'),
      });

      return accumulator;
    }, []);
}

export const getIntegrationHub = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'Tenant context is required' },
      });
      return;
    }

    const hub = await getManagedIntegrationHub(req.tenantId);
    res.json({
      success: true,
      data: hub,
    });
  } catch (error) {
    next(error);
  }
};

export const getIntegrationDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'Tenant context is required' },
      });
      return;
    }

    const detail = await getManagedIntegrationDetail(req.tenantId, req.params.slug);
    if (!detail) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Managed integration not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

export const beginConnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId || !req.userId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_CONTEXT', message: 'User and tenant context are required' },
      });
      return;
    }

    const result = await beginManagedIntegrationConnect(req.tenantId, req.userId, req.params.slug, {
      returnPath: typeof req.body?.returnPath === 'string' ? req.body.returnPath : undefined,
    });

    res.json({
      success: true,
      message: 'Connection flow initialized',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const completeConnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'Tenant context is required' },
      });
      return;
    }

    const result = await completeManagedIntegrationConnect(req.tenantId, req.params.slug, {
      connectionId: typeof req.body?.connectionId === 'string' ? req.body.connectionId : undefined,
      workspaceName: typeof req.body?.workspaceName === 'string' ? req.body.workspaceName : undefined,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      vendorWorkspaceUrl: typeof req.body?.vendorWorkspaceUrl === 'string' ? req.body.vendorWorkspaceUrl : undefined,
      vendorWorkspaceEmail: typeof req.body?.vendorWorkspaceEmail === 'string' ? req.body.vendorWorkspaceEmail : undefined,
      subscriptionPlan: typeof req.body?.subscriptionPlan === 'string' ? req.body.subscriptionPlan : undefined,
      subscriptionStatus: typeof req.body?.subscriptionStatus === 'string' ? req.body.subscriptionStatus : undefined,
      renewalDate: typeof req.body?.renewalDate === 'string' ? req.body.renewalDate : undefined,
      billingOwnerName: typeof req.body?.billingOwnerName === 'string' ? req.body.billingOwnerName : undefined,
      selectedAssets: parseSelectedAssets(req.body?.selectedAssets),
    });

    res.json({
      success: true,
      message: 'Managed connection completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'Tenant context is required' },
      });
      return;
    }

    const result = await disconnectManagedIntegration(req.tenantId, req.params.slug);
    res.json({
      success: true,
      message: 'Managed connection disconnected',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const syncNow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'Tenant context is required' },
      });
      return;
    }

    const result = await syncManagedIntegration(req.tenantId, req.params.slug);
    res.json({
      success: true,
      message: 'Sync state refreshed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const callback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const connectionId = typeof req.query.connection_id === 'string'
      ? req.query.connection_id
      : typeof req.query.connectionId === 'string'
        ? req.query.connectionId
        : undefined;
    const workspace = typeof req.query.workspace === 'string'
      ? req.query.workspace
      : typeof req.query.account_name === 'string'
        ? req.query.account_name
        : undefined;
    const assetsRaw = typeof req.query.assets === 'string' ? req.query.assets : undefined;
    const assets = assetsRaw
      ? assetsRaw.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

    const result = await handleManagedIntegrationCallback(req.params.slug, {
      state,
      status,
      connectionId,
      workspace,
      assets,
      note: typeof req.query.note === 'string' ? req.query.note : undefined,
    });

    res.redirect(result.redirectUrl);
  } catch (error) {
    next(error);
  }
};

export const proxyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({ success: false, error: { code: 'NO_TENANT', message: 'Tenant context is required' } });
      return;
    }

    const data = await proxySocialHubStats(req.tenantId);
    if (!data) {
      res.json({ success: true, data: null, message: 'WA CRM not connected or missing credentials' });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const webhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await handleManagedIntegrationWebhook(req.params.slug, req.headers, req.body);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
