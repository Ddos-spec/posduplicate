import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { encrypt, decrypt } from '../../../utils/crypto';

/**
 * Get all integrations for the current tenant
 */
export const getIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'No tenant ID found' }
      });
      return;
    }

    // Default integration types
    const defaultTypes = ['qris', 'gofood', 'grabfood', 'shopeefood'];

    // Fetch existing integrations
    const existingIntegrations = await prisma.integrations.findMany({
      where: { tenant_id: tenantId },
    });

    // Merge with defaults to ensure all types are returned even if not in DB yet
    const result = defaultTypes.map(type => {
      const existing = existingIntegrations.find(i => i.integration_type === type);
      if (existing) {
        // Decrypt credentials before sending
        const decryptedCredentials = existing.credentials ?
          (typeof existing.credentials === 'string' ? decrypt(existing.credentials) : existing.credentials) :
          {};
        return {
          id: existing.id,
          tenantId: existing.tenant_id,
          integrationType: existing.integration_type,
          status: existing.status,
          isActive: existing.is_active,
          configuration: existing.configuration,
          credentials: decryptedCredentials,
          metadata: existing.metadata,
          activatedAt: existing.activated_at,
          lastSyncAt: existing.last_sync_at,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at
        };
      }
      return {
        integrationType: type,
        status: 'inactive',
        isActive: false,
        configuration: {},
        credentials: {},
        metadata: {}
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    next(error);
  }
};

/**
 * Update or Create an integration configuration
 */
export const updateIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { integrationType } = req.params;
    const { status, configuration, credentials, isActive } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'No tenant ID found' }
      });
      return;
    }

    // Encrypt credentials before storing
    const encryptedCredentials = credentials ? encrypt(credentials) : null;

    // Upsert (Update if exists, Create if not)
    const integration = await prisma.integrations.upsert({
      where: {
        tenant_id_integration_type: {
          tenant_id: tenantId,
          integration_type: integrationType
        }
      },
      update: {
        status: status || 'inactive',
        is_active: isActive ?? false,
        configuration: configuration || {},
        credentials: encryptedCredentials || {},
        updated_at: new Date()
      },
      create: {
        tenant_id: tenantId,
        integration_type: integrationType,
        status: status || 'inactive',
        is_active: isActive ?? false,
        configuration: configuration || {},
        credentials: encryptedCredentials || {},
        metadata: {}
      }
    });

    // Decrypt credentials before sending response
    const decryptedCredentials = integration.credentials ?
      (typeof integration.credentials === 'string' ? decrypt(integration.credentials) : integration.credentials) :
      {};

    const responseIntegration = {
      id: integration.id,
      tenantId: integration.tenant_id,
      integrationType: integration.integration_type,
      status: integration.status,
      isActive: integration.is_active,
      configuration: integration.configuration,
      credentials: decryptedCredentials,
      metadata: integration.metadata,
      activatedAt: integration.activated_at,
      lastSyncAt: integration.last_sync_at,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at
    };

    res.json({
      success: true,
      message: `${integrationType} integration updated successfully`,
      data: responseIntegration
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    next(error);
  }
};
