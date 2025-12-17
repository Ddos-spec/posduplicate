import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Extend Express Request to include API Key info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKeyTenantId?: number;
    }
  }
}

/**
 * Middleware to authenticate requests using API keys
 * API key should be provided in the X-API-Key header
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'API key is required. Please provide it in the X-API-Key header.',
        },
      });
    }

    // Find the API key in database (Comparing PLAIN TEXT for simplicity per user request, 
    // normally hashing is preferred but requires more complex management UI for "show once")
    const apiKeyRecord = await prisma.api_keys.findUnique({
      where: { api_key: apiKey },
      include: {
        tenants: {
          select: {
            id: true,
            is_active: true,
            subscription_status: true,
            business_name: true,
          },
        },
      },
    });

    if (!apiKeyRecord) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key.',
        },
      });
    }

    // Check if API key is active
    if (!apiKeyRecord.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'API_KEY_DISABLED',
          message: 'This API key has been disabled.',
        },
      });
    }

    // Check if API key has expired
    if (apiKeyRecord.expires_at && apiKeyRecord.expires_at < new Date()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'API_KEY_EXPIRED',
          message: 'This API key has expired.',
        },
      });
    }

    // Check if tenant is active
    if (!apiKeyRecord.tenants.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: 'Your account is inactive. Please contact support.',
        },
      });
    }

    // Update last used timestamp (Async - don't await to keep response fast)
    prisma.api_keys.update({
      where: { id: apiKeyRecord.id },
      data: { last_used: new Date() },
    }).catch((err: unknown) => console.error('Failed to update last_used:', err));

    // Attach tenant ID to request
    req.apiKeyTenantId = apiKeyRecord.tenant_id;
    // Also attach to standard tenantId for compatibility with other controllers if needed
    req.tenantId = apiKeyRecord.tenant_id;

    return next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during authentication.',
      },
    });
  }
};
