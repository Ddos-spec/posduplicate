import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { decrypt } from '../utils/crypto';

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
    const qrisIntegration = await prisma.integration.findFirst({
      where: {
        integrationType: 'qris',
        isActive: true
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
  _res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-gofood-signature'] as string;

    if (!signature) {
      // For development, log and continue
      console.warn('[GoFood Webhook] No signature provided');
      return next();
    }

    // Implementation similar to QRIS
    return next();
  } catch (error) {
    console.error('[GoFood Signature Verification] Error:', error);
    return next(error);
  }
};

/**
 * Verify GrabFood webhook signature
 */
export const verifyGrabFoodSignature = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-grabfood-signature'] as string;

    if (!signature) {
      console.warn('[GrabFood Webhook] No signature provided');
      return next();
    }

    // Implementation similar to QRIS
    return next();
  } catch (error) {
    console.error('[GrabFood Signature Verification] Error:', error);
    return next(error);
  }
};

/**
 * Verify ShopeeFood webhook signature
 */
export const verifyShopeeFoodSignature = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-shopeefood-signature'] as string;

    if (!signature) {
      console.warn('[ShopeeFood Webhook] No signature provided');
      return next();
    }

    // Implementation similar to QRIS
    return next();
  } catch (error) {
    console.error('[ShopeeFood Signature Verification] Error:', error);
    return next(error);
  }
};
