import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all integrations for the current tenant
 */
export const getIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'No tenant ID found' }
      });
    }

    // Default integration types
    const defaultTypes = ['qris', 'gofood', 'grabfood', 'shopeefood'];

    // Fetch existing integrations
    const existingIntegrations = await prisma.integration.findMany({
      where: { tenantId },
    });

    // Merge with defaults to ensure all types are returned even if not in DB yet
    const result = defaultTypes.map(type => {
      const existing = existingIntegrations.find(i => i.integrationType === type);
      return existing || {
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
      return res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'No tenant ID found' }
      });
    }

    // Upsert (Update if exists, Create if not)
    const integration = await prisma.integration.upsert({
      where: {
        tenantId_integrationType: {
          tenantId,
          integrationType
        }
      },
      update: {
        status: status || 'inactive',
        isActive: isActive ?? false,
        configuration: configuration || {},
        credentials: credentials || {}, // In real app, encrypt this!
        updatedAt: new Date()
      },
      create: {
        tenantId,
        integrationType,
        status: status || 'inactive',
        isActive: isActive ?? false,
        configuration: configuration || {},
        credentials: credentials || {},
        metadata: {}
      }
    });

    res.json({
      success: true,
      message: `${integrationType} integration updated successfully`,
      data: integration
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    next(error);
  }
};
