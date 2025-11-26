import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { hashApiKey } from '../utils/apiKeyGenerator';

// Extend Express Request type
declare global {
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

    // Validate API key format
    if (!apiKey.startsWith('mypos_live_')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY_FORMAT',
          message: 'Invalid API key format.',
        },
      });
    }

    // Hash the provided API key
    const hashedKey = hashApiKey(apiKey);

    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { api_key: hashedKey },
      include: {
        tenant: {
          select: {
            id: true,
            isActive: true,
            subscriptionStatus: true,
            businessName: true,
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
    if (!apiKeyRecord.tenant.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: 'Your account is inactive. Please contact support.',
        },
      });
    }

    // Check tenant subscription status
    if (apiKeyRecord.tenant.subscriptionStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_INACTIVE',
          message: 'Your subscription is not active. Please renew your subscription.',
        },
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { last_used: new Date() },
    });

    // Attach tenant ID to request
    req.apiKeyTenantId = apiKeyRecord.tenant_id;

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
