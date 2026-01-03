import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import crypto from 'crypto';
import { cacheWebhookResult } from '../../../middlewares/webhook.middleware';
import { safeParseFloat } from '../../../utils/validation';

/**
 * Map food delivery status to internal status
 */
const mapDeliveryStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'new': 'pending',
    'accepted': 'processing',
    'preparing': 'processing',
    'ready': 'ready',
    'picked_up': 'delivering',
    'delivered': 'completed',
    'cancelled': 'cancelled',
    'rejected': 'cancelled'
  };
  return statusMap[status?.toLowerCase()] || status;
};

/**
 * Create transaction from food delivery webhook
 */
const createTransactionFromWebhook = async (
  platform: 'gofood' | 'grabfood' | 'shopeefood',
  orderId: string,
  outletId: number,
  orderData: {
    items?: any[];
    customer?: { name?: string; phone?: string };
    totalAmount?: number;
    status?: string;
    notes?: string;
  }
) => {
  const transactionNumber = `${platform.toUpperCase()}-${orderId}`;

  // Check for existing transaction
  const existing = await prisma.transactions.findFirst({
    where: { transaction_number: transactionNumber }
  });

  if (existing) {
    return existing;
  }

  // Calculate totals from items if provided
  let subtotal = safeParseFloat(orderData.totalAmount);
  const transactionItems: any[] = [];

  if (orderData.items && Array.isArray(orderData.items)) {
    subtotal = 0;
    for (const item of orderData.items) {
      const quantity = safeParseFloat(item.quantity, 1);
      const unitPrice = safeParseFloat(item.price || item.unitPrice);
      const itemSubtotal = quantity * unitPrice;
      subtotal += itemSubtotal;

      // Try to find matching item in system
      const matchedItem = await prisma.items.findFirst({
        where: {
          OR: [
            { sku: item.sku },
            { name: item.name }
          ],
          outlet_id: outletId
        }
      });

      transactionItems.push({
        item_id: matchedItem?.id || null,
        item_name: item.name || 'Unknown Item',
        quantity,
        unit_price: unitPrice,
        subtotal: itemSubtotal,
        discount_amount: 0,
        notes: item.notes || null
      });
    }
  }

  // Create transaction
  const transaction = await prisma.transactions.create({
    data: {
      transaction_number: transactionNumber,
      order_type: 'delivery',
      customer_name: orderData.customer?.name || `${platform} Customer`,
      customer_phone: orderData.customer?.phone || null,
      subtotal,
      discount_amount: 0,
      tax_amount: 0,
      service_charge: 0,
      total: subtotal,
      status: mapDeliveryStatus(orderData.status || 'new'),
      outlet_id: outletId,
      notes: `${platform.toUpperCase()} Order - ${orderData.notes || ''}`,
      transaction_items: transactionItems.length > 0 ? {
        create: transactionItems
      } : undefined,
      payments: {
        create: {
          method: platform,
          amount: subtotal,
          change_amount: 0,
          reference_number: orderId,
          status: 'completed'
        }
      }
    },
    include: {
      transaction_items: true,
      payments: true
    }
  });

  console.log(`[${platform.toUpperCase()} Webhook] Created transaction ${transaction.id} for order ${orderId}`);
  return transaction;
};

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

    const result = {
      success: true,
      message: 'QRIS webhook processed successfully'
    };

    // Cache result for idempotency
    if ((req as any).idempotencyKey) {
      cacheWebhookResult((req as any).idempotencyKey, result);
    }

    return res.json(result);
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
    const { orderId, status, items, customer, totalAmount, notes } = req.body;
    const outletId = (req as any).integrationOutletId;

    console.log('[GoFood Webhook] Received:', {
      orderId,
      status,
      totalAmount,
      outletId
    });

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_CONFIGURED',
          message: 'GoFood integration outlet not configured'
        }
      });
    }

    // Check for existing transaction
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        transaction_number: `GOFOOD-${orderId}`
      }
    });

    if (existingTransaction) {
      // Update existing transaction status
      const mappedStatus = mapDeliveryStatus(status);
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: {
          status: mappedStatus,
          completed_at: mappedStatus === 'completed' ? new Date() : null
        }
      });

      const result = {
        success: true,
        message: 'GoFood order status updated',
        data: { transactionId: existingTransaction.id, status: mappedStatus }
      };

      if ((req as any).idempotencyKey) {
        cacheWebhookResult((req as any).idempotencyKey, result);
      }

      return res.json(result);
    }

    // Create new transaction from GoFood order
    const transaction = await createTransactionFromWebhook('gofood', orderId, outletId, {
      items,
      customer,
      totalAmount: safeParseFloat(totalAmount),
      status,
      notes
    });

    const result = {
      success: true,
      message: 'GoFood order created successfully',
      data: { transactionId: transaction.id, transactionNumber: transaction.transaction_number }
    };

    if ((req as any).idempotencyKey) {
      cacheWebhookResult((req as any).idempotencyKey, result);
    }

    return res.json(result);
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
    const { orderId, status, items, customer, totalAmount, notes } = req.body;
    const outletId = (req as any).integrationOutletId;

    console.log('[GrabFood Webhook] Received:', {
      orderId,
      status,
      totalAmount,
      outletId
    });

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_CONFIGURED',
          message: 'GrabFood integration outlet not configured'
        }
      });
    }

    // Check for existing transaction
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        transaction_number: `GRABFOOD-${orderId}`
      }
    });

    if (existingTransaction) {
      const mappedStatus = mapDeliveryStatus(status);
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: {
          status: mappedStatus,
          completed_at: mappedStatus === 'completed' ? new Date() : null
        }
      });

      const result = {
        success: true,
        message: 'GrabFood order status updated',
        data: { transactionId: existingTransaction.id, status: mappedStatus }
      };

      if ((req as any).idempotencyKey) {
        cacheWebhookResult((req as any).idempotencyKey, result);
      }

      return res.json(result);
    }

    // Create new transaction from GrabFood order
    const transaction = await createTransactionFromWebhook('grabfood', orderId, outletId, {
      items,
      customer,
      totalAmount: safeParseFloat(totalAmount),
      status,
      notes
    });

    const result = {
      success: true,
      message: 'GrabFood order created successfully',
      data: { transactionId: transaction.id, transactionNumber: transaction.transaction_number }
    };

    if ((req as any).idempotencyKey) {
      cacheWebhookResult((req as any).idempotencyKey, result);
    }

    return res.json(result);
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
    const { orderId, status, items, customer, totalAmount, notes } = req.body;
    const outletId = (req as any).integrationOutletId;

    console.log('[ShopeeFood Webhook] Received:', {
      orderId,
      status,
      totalAmount,
      outletId
    });

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_CONFIGURED',
          message: 'ShopeeFood integration outlet not configured'
        }
      });
    }

    // Check for existing transaction
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        transaction_number: `SHOPEEFOOD-${orderId}`
      }
    });

    if (existingTransaction) {
      const mappedStatus = mapDeliveryStatus(status);
      await prisma.transactions.update({
        where: { id: existingTransaction.id },
        data: {
          status: mappedStatus,
          completed_at: mappedStatus === 'completed' ? new Date() : null
        }
      });

      const result = {
        success: true,
        message: 'ShopeeFood order status updated',
        data: { transactionId: existingTransaction.id, status: mappedStatus }
      };

      if ((req as any).idempotencyKey) {
        cacheWebhookResult((req as any).idempotencyKey, result);
      }

      return res.json(result);
    }

    // Create new transaction from ShopeeFood order
    const transaction = await createTransactionFromWebhook('shopeefood', orderId, outletId, {
      items,
      customer,
      totalAmount: safeParseFloat(totalAmount),
      status,
      notes
    });

    const result = {
      success: true,
      message: 'ShopeeFood order created successfully',
      data: { transactionId: transaction.id, transactionNumber: transaction.transaction_number }
    };

    if ((req as any).idempotencyKey) {
      cacheWebhookResult((req as any).idempotencyKey, result);
    }

    return res.json(result);
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
