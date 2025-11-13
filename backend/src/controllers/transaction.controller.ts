import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all transactions
 */
export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, outlet_id, date_from, date_to, limit = '50' } = req.query;

    const where: any = {};

    // Tenant isolation
    if (req.tenantId) {
      where.outlet = { tenantId: req.tenantId };
    }

    if (status) {
      where.status = status;
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) where.createdAt.lte = new Date(date_to as string);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        outlet: {
          select: { id: true, name: true }
        },
        table: {
          select: { id: true, name: true }
        },
        cashier: {
          select: { id: true, name: true, email: true }
        },
        transactionItems: {
          include: {
            item: true,
            variant: true,
            transactionModifiers: {
              include: {
                modifier: true
              }
            }
          }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        outlet: true,
        table: true,
        cashier: true,
        transactionItems: {
          include: {
            item: true,
            variant: true,
            transactionModifiers: {
              include: {
                modifier: true
              }
            }
          }
        },
        payments: true
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    // Tenant isolation
    if (req.tenantId && transaction.outlet?.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create transaction (checkout)
 */
export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      orderType,
      tableId,
      customerName,
      customerPhone,
      items, // Array of { itemId, variantId?, quantity, modifiers[] }
      discountAmount = 0,
      taxAmount = 0,
      serviceCharge = 0,
      payments, // Array of { method, amount }
      outletId,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Items are required'
        }
      });
    }

    // Generate transaction number
    const transactionNumber = `TRX-${Date.now()}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      const itemData = await prisma.item.findUnique({
        where: { id: item.itemId }
      });
      if (!itemData) continue;

      let itemPrice = parseFloat(itemData.price.toString());

      // Add variant price adjustment
      if (item.variantId) {
        const variant = await prisma.variant.findUnique({
          where: { id: item.variantId }
        });
        if (variant) {
          itemPrice += parseFloat(variant.priceAdjust.toString());
        }
      }

      // Add modifiers price
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifierId of item.modifiers) {
          const modifier = await prisma.modifier.findUnique({
            where: { id: modifierId }
          });
          if (modifier) {
            itemPrice += parseFloat(modifier.price.toString());
          }
        }
      }

      subtotal += itemPrice * item.quantity;
    }

    const total = subtotal - discountAmount + taxAmount + serviceCharge;

    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        transactionNumber,
        orderType,
        tableId,
        customerName,
        customerPhone,
        subtotal,
        discountAmount,
        taxAmount,
        serviceCharge,
        total,
        status: 'completed',
        outletId,
        cashierId: req.userId,
        notes,
        transactionItems: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            variantId: item.variantId,
            itemName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
            discountAmount: 0,
            notes: item.notes,
            transactionModifiers: item.modifiers ? {
              create: item.modifiers.map((modId: number) => ({
                modifierId: modId,
                modifierName: '',
                price: 0
              }))
            } : undefined
          }))
        },
        payments: payments ? {
          create: payments.map((p: any) => ({
            method: p.method,
            amount: p.amount,
            changeAmount: p.changeAmount || 0,
            referenceNumber: p.referenceNumber,
            status: 'completed'
          }))
        } : undefined
      },
      include: {
        transactionItems: {
          include: {
            transactionModifiers: true
          }
        },
        payments: true
      }
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Hold order
 */
export const holdOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderData } = req.body;

    const heldOrder = await prisma.heldOrder.create({
      data: {
        orderData,
        cashierId: req.userId,
        outletId: orderData.outletId
      }
    });

    res.status(201).json({
      success: true,
      data: heldOrder,
      message: 'Order held successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get held orders
 */
export const getHeldOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const heldOrders = await prisma.heldOrder.findMany({
      where: {
        cashierId: req.userId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: heldOrders,
      count: heldOrders.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        status,
        ...(status === 'completed' && { completedAt: new Date() })
      }
    });

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction status updated'
    });
  } catch (error) {
    next(error);
  }
};
