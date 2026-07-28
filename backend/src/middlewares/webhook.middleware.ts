import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/crypto';
import { Prisma } from '@prisma/client';

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting state
const rateLimitState = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per integration

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      webhookIntegration?: any;
      integrationTenantId?: number;
      integrationOutletId?: number | null;
      idempotencyKey?: string;
    }
  }
}

const getPayload = (req: Request): Buffer => (
  req.rawBody ?? Buffer.from(JSON.stringify(req.body))
);

/**
 * Resolve the exact tenant integration before signature verification.
 * If multiple tenants configured the same provider, callers must send
 * X-Integration-ID (or integration_id) so no arbitrary first row is used.
 */
export const resolveWebhookIntegration = (integrationType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const selector = req.header('X-Integration-ID')
        ?? String(req.query.integration_id ?? req.body.integrationId ?? '').trim();
      const integrationId = Number(selector);

      let integrations;
      if (selector && Number.isInteger(integrationId) && integrationId > 0) {
        integrations = await prisma.integrations.findMany({
          where: {
            id: integrationId,
            integration_type: integrationType,
            is_active: true
          },
          take: 1
        });
      } else {
        integrations = await prisma.integrations.findMany({
          where: {
            integration_type: integrationType,
            is_active: true
          },
          take: 2,
          orderBy: { id: 'asc' }
        });
      }

      if (integrations.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'INTEGRATION_NOT_FOUND', message: `${integrationType} integration not configured` }
        });
      }
      if (!selector && integrations.length > 1) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'INTEGRATION_AMBIGUOUS',
            message: 'X-Integration-ID is required when multiple tenant integrations are active'
          }
        });
      }

      const integration = integrations[0];
      const config = integration.configuration as any;
      const outletId = Number(config?.outlet_id ?? config?.outletId ?? 0) || null;
      if (outletId) {
        const outlet = await prisma.outlets.findFirst({
          where: { id: outletId, tenant_id: integration.tenant_id },
          select: { id: true }
        });
        if (!outlet) {
          return res.status(500).json({
            success: false,
            error: { code: 'INVALID_INTEGRATION_OUTLET', message: 'Configured outlet does not belong to integration tenant' }
          });
        }
      }

      req.webhookIntegration = integration;
      req.integrationTenantId = integration.tenant_id;
      req.integrationOutletId = outletId;
      return next();
    } catch (error) {
      console.error(`[${integrationType} Webhook Resolution] Error:`, error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTEGRATION_RESOLUTION_ERROR', message: 'Unable to resolve webhook integration' }
      });
    }
  };
};

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
  return async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.body.orderId || req.body.transactionId || req.body.referenceNumber;
    if (!orderId) {
      return next();
    }

    const tenantId = req.integrationTenantId;
    const idempotencyKey = `${integrationType}-${tenantId ?? 'none'}-${orderId}-${req.body.status || 'default'}`;
    try {
      await prisma.webhook_events.deleteMany({
        where: { expires_at: { lt: new Date() } }
      });

      const existing = await prisma.webhook_events.findUnique({
        where: { idempotency_key: idempotencyKey }
      });
      if (existing?.event_status === 'completed' && existing.response_payload) {
        return res.json(existing.response_payload);
      }
      if (existing) {
        return res.status(202).json({
          success: true,
          message: 'Webhook event is already being processed'
        });
      }

      await prisma.webhook_events.create({
        data: {
          idempotency_key: idempotencyKey,
          integration_type: integrationType,
          tenant_id: tenantId ?? null,
          external_id: String(orderId),
          expires_at: new Date(Date.now() + IDEMPOTENCY_TTL)
        }
      });
      req.idempotencyKey = idempotencyKey;
      return next();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(202).json({
          success: true,
          message: 'Webhook event is already being processed'
        });
      }
      return next(error);
    }
  };
};

/**
 * Store result in idempotency cache
 */
export const cacheWebhookResult = async (key: string, result: any) => {
  await prisma.webhook_events.update({
    where: { idempotency_key: key },
    data: {
      event_status: 'completed',
      response_payload: result,
      completed_at: new Date()
    }
  });
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
    const payload = getPayload(req);

    if (!signature) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature is required'
        }
      });
    }

    const qrisIntegration = req.webhookIntegration;

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

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature format' }
      });
    }

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
    const payload = getPayload(req);

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

    const gofoodIntegration = req.webhookIntegration;

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
    const payload = getPayload(req);

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

    const grabfoodIntegration = req.webhookIntegration;

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
    const payload = getPayload(req);

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

    const shopeefoodIntegration = req.webhookIntegration;

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
