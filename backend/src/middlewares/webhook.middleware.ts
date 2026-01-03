import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/crypto';

// In-memory idempotency cache (consider Redis for production)
const processedWebhooks = new Map<string, { timestamp: number; result: any }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting state
const rateLimitState = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per integration

/**
 * Clean up expired idempotency keys
 */
const cleanupIdempotencyCache = () => {
  const now = Date.now();
  for (const [key, value] of processedWebhooks.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      processedWebhooks.delete(key);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupIdempotencyCache, 60 * 60 * 1000);

/**
 * Rate limiting middleware for webhooks
 */
export const webhookRateLimiter = (integrationType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${integrationType}-${req.ip}`;
    const state = rateLimitState.get(key);

    if (!state || now > state.resetTime) {
      rateLimitState.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return next();
    }

    if (state.count >= RATE_LIMIT_MAX) {
      console.warn(`[${integrationType} Webhook] Rate limit exceeded for ${req.ip}`);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many webhook requests. Please try again later.'
        }
      });
    }

    state.count++;
    return next();
  };
};

/**
 * Idempotency middleware for webhooks
 */
export const webhookIdempotency = (integrationType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.body.orderId || req.body.transactionId || req.body.referenceNumber;
    if (!orderId) {
      return next();
    }

    const idempotencyKey = `${integrationType}-${orderId}-${req.body.status || 'default'}`;
    const cached = processedWebhooks.get(idempotencyKey);

    if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
      console.log(`[${integrationType} Webhook] Duplicate request detected for ${orderId}`);
      return res.json(cached.result);
    }

    // Store idempotency key in request for later use
    (req as any).idempotencyKey = idempotencyKey;
    return next();
  };
};

/**
 * Store result in idempotency cache
 */
export const cacheWebhookResult = (key: string, result: any) => {
  processedWebhooks.set(key, { timestamp: Date.now(), result });
};

/**
 * Verify QRIS webhook signature
 */
export const verifyQRISSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-qris-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature is required'
        }
      });
    }

    // Get QRIS configuration from any active integration
    const qrisIntegration = await prisma.integrations.findFirst({
      where: {
        integration_type: 'qris',
        is_active: true
      }
    });

    if (!qrisIntegration) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INTEGRATION_NOT_FOUND',
          message: 'QRIS integration not configured'
        }
      });
    }

    // Decrypt and get webhook secret
    const credentials = qrisIntegration.credentials ?
      (typeof qrisIntegration.credentials === 'string' ?
        decrypt(qrisIntegration.credentials) :
        qrisIntegration.credentials) :
      {};

    const webhookSecret = credentials.webhookSecret || credentials.apiKey;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_SECRET_MISSING',
          message: 'Webhook secret not configured'
        }
      });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature'
        }
      });
    }

    return next();
  } catch (error) {
    console.error('[QRIS Signature Verification] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify webhook signature'
      }
    });
  }
};

/**
 * Verify GoFood webhook signature
 */
export const verifyGoFoodSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-gofood-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      console.warn('[GoFood Webhook] No signature provided - rejecting request');
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature is required'
        }
      });
    }

    // Get GoFood integration configuration
    const gofoodIntegration = await prisma.integrations.findFirst({
      where: {
        integration_type: 'gofood',
        is_active: true
      }
    });

    if (!gofoodIntegration) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INTEGRATION_NOT_FOUND',
          message: 'GoFood integration not configured'
        }
      });
    }

    // Decrypt and get webhook secret
    const credentials = gofoodIntegration.credentials ?
      (typeof gofoodIntegration.credentials === 'string' ?
        decrypt(gofoodIntegration.credentials) :
        gofoodIntegration.credentials) :
      {};

    const webhookSecret = credentials.webhookSecret || credentials.apiKey;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_SECRET_MISSING',
          message: 'GoFood webhook secret not configured'
        }
      });
    }

    // Verify signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.warn('[GoFood Webhook] Invalid signature');
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        });
      }
    } catch {
      // Buffer length mismatch
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature format'
        }
      });
    }

    // Store outlet_id from integration configuration JSON
    const config = gofoodIntegration.configuration as any;
    (req as any).integrationOutletId = config?.outlet_id || config?.outletId || null;
    (req as any).integrationTenantId = gofoodIntegration.tenant_id;

    return next();
  } catch (error) {
    console.error('[GoFood Signature Verification] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify webhook signature'
      }
    });
  }
};

/**
 * Verify GrabFood webhook signature
 */
export const verifyGrabFoodSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-grabfood-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      console.warn('[GrabFood Webhook] No signature provided - rejecting request');
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature is required'
        }
      });
    }

    // Get GrabFood integration configuration
    const grabfoodIntegration = await prisma.integrations.findFirst({
      where: {
        integration_type: 'grabfood',
        is_active: true
      }
    });

    if (!grabfoodIntegration) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INTEGRATION_NOT_FOUND',
          message: 'GrabFood integration not configured'
        }
      });
    }

    // Decrypt and get webhook secret
    const credentials = grabfoodIntegration.credentials ?
      (typeof grabfoodIntegration.credentials === 'string' ?
        decrypt(grabfoodIntegration.credentials) :
        grabfoodIntegration.credentials) :
      {};

    const webhookSecret = credentials.webhookSecret || credentials.apiKey;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_SECRET_MISSING',
          message: 'GrabFood webhook secret not configured'
        }
      });
    }

    // Verify signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.warn('[GrabFood Webhook] Invalid signature');
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        });
      }
    } catch {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature format'
        }
      });
    }

    // Store outlet_id from integration configuration JSON
    const config = grabfoodIntegration.configuration as any;
    (req as any).integrationOutletId = config?.outlet_id || config?.outletId || null;
    (req as any).integrationTenantId = grabfoodIntegration.tenant_id;

    return next();
  } catch (error) {
    console.error('[GrabFood Signature Verification] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify webhook signature'
      }
    });
  }
};

/**
 * Verify ShopeeFood webhook signature
 */
export const verifyShopeeFoodSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-shopeefood-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      console.warn('[ShopeeFood Webhook] No signature provided - rejecting request');
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature is required'
        }
      });
    }

    // Get ShopeeFood integration configuration
    const shopeefoodIntegration = await prisma.integrations.findFirst({
      where: {
        integration_type: 'shopeefood',
        is_active: true
      }
    });

    if (!shopeefoodIntegration) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INTEGRATION_NOT_FOUND',
          message: 'ShopeeFood integration not configured'
        }
      });
    }

    // Decrypt and get webhook secret
    const credentials = shopeefoodIntegration.credentials ?
      (typeof shopeefoodIntegration.credentials === 'string' ?
        decrypt(shopeefoodIntegration.credentials) :
        shopeefoodIntegration.credentials) :
      {};

    const webhookSecret = credentials.webhookSecret || credentials.apiKey;

    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_SECRET_MISSING',
          message: 'ShopeeFood webhook secret not configured'
        }
      });
    }

    // Verify signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.warn('[ShopeeFood Webhook] Invalid signature');
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        });
      }
    } catch {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature format'
        }
      });
    }

    // Store outlet_id from integration configuration JSON
    const config = shopeefoodIntegration.configuration as any;
    (req as any).integrationOutletId = config?.outlet_id || config?.outletId || null;
    (req as any).integrationTenantId = shopeefoodIntegration.tenant_id;

    return next();
  } catch (error) {
    console.error('[ShopeeFood Signature Verification] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify webhook signature'
      }
    });
  }
};
