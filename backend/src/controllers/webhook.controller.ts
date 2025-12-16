import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import crypto from 'crypto';

/**
 * QRIS Payment Webhook
 */
export const qrisWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId, status, amount, referenceNumber, metadata: _metadata } = req.body;

    console.log('[QRIS Webhook] Received:', {
      transactionId,
      status,
      amount,
      referenceNumber
    });

    // Find the payment by reference number
    const payment = await prisma.payments.findFirst({
      where: {
        reference_number: referenceNumber,
        method: 'qris'
      },
      include: {
        transactions: true
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found'
        }
      });
    }

    // Update payment status
    await prisma.payments.update({
      where: { id: payment.id },
      data: {
        status: status === 'success' ? 'completed' : 'failed'
      }
    });

    // Update transaction status if all payments are completed
    if (status === 'success') {
      await prisma.transactions.update({
        where: { id: payment.transaction_id },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });
    }

    return res.json({
      success: true,
      message: 'QRIS webhook processed successfully'
    });
  } catch (error) {
    console.error('[QRIS Webhook] Error:', error);
    return next(error);
  }
};

/**
 * GoFood Order Webhook
 */
export const gofoodWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, status, items: _items, customer: _customer, totalAmount, metadata: _metadata } = req.body;

    console.log('[GoFood Webhook] Received:', {
      orderId,
      status,
      totalAmount
    });

    // Create or update transaction based on GoFood order
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        transaction_number: `GOFOOD-${orderId}`
      }
    });

    if (existingTransaction) {
      // Update existing transaction
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: {
          status: status === 'delivered' ? 'completed' : status,
          completed_at: status === 'delivered' ? new Date() : null
        }
      });
    } else {
      // Create new transaction from GoFood order
      // Note: This requires outlet mapping from integration config
      // For now, log and return success
      console.log('[GoFood Webhook] New order received, manual processing required');
    }

    return res.json({
      success: true,
      message: 'GoFood webhook processed successfully'
    });
  } catch (error) {
    console.error('[GoFood Webhook] Error:', error);
    return next(error);
  }
};

/**
 * GrabFood Order Webhook
 */
export const grabfoodWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, status, items: _items, customer: _customer, totalAmount, metadata: _metadata } = req.body;

    console.log('[GrabFood Webhook] Received:', {
      orderId,
      status,
      totalAmount
    });

    // Similar to GoFood, create or update transaction
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        transaction_number: `GRABFOOD-${orderId}`
      }
    });

    if (existingTransaction) {
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: {
          status: status === 'delivered' ? 'completed' : status,
          completed_at: status === 'delivered' ? new Date() : null
        }
      });
    } else {
      console.log('[GrabFood Webhook] New order received, manual processing required');
    }

    return res.json({
      success: true,
      message: 'GrabFood webhook processed successfully'
    });
  } catch (error) {
    console.error('[GrabFood Webhook] Error:', error);
    return next(error);
  }
};

/**
 * ShopeeFood Order Webhook
 */
export const shopeefoodWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, status, items: _items, customer: _customer, totalAmount, metadata: _metadata } = req.body;

    console.log('[ShopeeFood Webhook] Received:', {
      orderId,
      status,
      totalAmount
    });

    // Similar to GoFood and GrabFood
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        transaction_number: `SHOPEEFOOD-${orderId}`
      }
    });

    if (existingTransaction) {
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: {
          status: status === 'delivered' ? 'completed' : status,
          completed_at: status === 'delivered' ? new Date() : null
        }
      });
    } else {
      console.log('[ShopeeFood Webhook] New order received, manual processing required');
    }

    return res.json({
      success: true,
      message: 'ShopeeFood webhook processed successfully'
    });
  } catch (error) {
    console.error('[ShopeeFood Webhook] Error:', error);
    return next(error);
  }
};

/**
 * Verify webhook signature (generic)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
