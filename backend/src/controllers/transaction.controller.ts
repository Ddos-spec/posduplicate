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
      where.outlets = { tenantId: req.tenantId };
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
        outlets: {
          select: { id: true, name: true }
        },
        tables: {
          select: { id: true, name: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        },
        transaction_items: {
          include: {
            items: true,
            variants: true,
            transaction_modifiers: {
              include: {
                modifiers: true
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
    return next(error);
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
        outlets: true,
        tables: true,
        users: true,
        transaction_items: {
          include: {
            items: true,
            variants: true,
            transaction_modifiers: {
              include: {
                modifiers: true
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
    if (req.tenantId && transaction.outlets?.tenantId !== req.tenantId) {
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
    return next(error);
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

    // Calculate totals and validate
    let subtotal = 0;
    const itemsWithPrices: any[] = [];

    for (const item of items) {
      const itemData = await prisma.items.findUnique({
        where: { id: item.itemId }
      });

      if (!itemData) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: `Item with ID ${item.itemId} not found`
          }
        });
      }

      let itemPrice = parseFloat(itemData.price.toString());
      const modifiersData: any[] = [];

      // Add variant price adjustment
      if (item.variantId) {
        const variant = await prisma.variants.findUnique({
          where: { id: item.variantId }
        });
        if (variant) {
          itemPrice += parseFloat((variant.price_adjust ?? 0).toString());
        }
      }

      // Add modifiers price
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifierId of item.modifiers) {
          const modifier = await prisma.modifiers.findUnique({
            where: { id: modifierId }
          });
          if (modifier) {
            const modPrice = parseFloat(modifier.price?.toString() || '0');
            itemPrice += modPrice;
            modifiersData.push({
              modifierId,
              modifierName: modifier.name,
              price: modPrice
            });
          }
        }
      }

      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

      itemsWithPrices.push({
        ...item,
        itemName: itemData.name,
        unitPrice: itemPrice,
        subtotal: itemSubtotal,
        modifiersData
      });
    }

    const total = subtotal - discountAmount + taxAmount + serviceCharge;

    // Validate payments
    if (payments && payments.length > 0) {
      const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      if (totalPaid < total) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PAYMENT',
            message: `Total payment (${totalPaid}) is less than transaction total (${total})`
          }
        });
      }
    }

    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        transaction_number: transactionNumber,
        order_type: orderType,
        table_id: tableId,
        customer_name: customerName,
        customer_phone: customerPhone,
        subtotal,
        discountAmount,
        taxAmount,
        service_charge: serviceCharge,
        total,
        status: 'completed',
        outletId,
        cashier_id: req.userId,
        notes,
        completed_at: new Date(),
        transaction_items: {
          create: itemsWithPrices.map((item: any) => ({
            item_id: item.itemId,
            variant_id: item.variantId,
            item_name: item.itemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal,
            discount_amount: 0,
            notes: item.notes,
            transaction_modifiers: item.modifiersData && item.modifiersData.length > 0 ? {
              create: item.modifiersData.map((mod: any) => ({
                modifier_id: mod.modifierId,
                modifier_name: mod.modifierName,
                price: mod.price
              }))
            } : undefined
          }))
        },
        payments: payments ? {
          create: payments.map((p: any) => ({
            method: p.method,
            amount: parseFloat(p.amount),
            change_amount: parseFloat(p.changeAmount || 0),
            reference_number: p.referenceNumber,
            status: 'completed'
          }))
        } : undefined
      },
      include: {
        transaction_items: {
          include: {
            transaction_modifiers: true
          }
        },
        payments: true
      }
    });

    // Update stock for items with tracking enabled
    for (const item of itemsWithPrices) {
      const itemData = await prisma.items.findUnique({
        where: { id: item.itemId },
        select: { trackStock: true, stock: true }
      });

      if (itemData?.trackStock) {
        await prisma.items.update({
          where: { id: item.itemId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Hold order (Save as pending transaction)
 */
export const holdOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderData } = req.body;

    // Store as pending transaction instead of separate table
    const transactionNumber = `HOLD-${Date.now()}`;

    const heldOrder = await prisma.transaction.create({
      data: {
        transaction_number: transactionNumber,
        order_type: orderData.orderType || 'dine-in',
        table_id: orderData.tableId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        subtotal: orderData.subtotal || 0,
        discountAmount: orderData.discountAmount || 0,
        taxAmount: orderData.taxAmount || 0,
        service_charge: orderData.serviceCharge || 0,
        total: orderData.total || 0,
        status: 'pending',
        outletId: orderData.outletId,
        cashier_id: req.userId,
        notes: 'Held order - ' + (orderData.notes || '')
      }
    });

    res.status(201).json({
      success: true,
      data: heldOrder,
      message: 'Order held successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get held orders (pending transactions)
 */
export const getHeldOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const heldOrders = await prisma.transaction.findMany({
      where: {
        cashier_id: req.userId,
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: heldOrders,
      count: heldOrders.length
    });
  } catch (error) {
    return next(error);
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
        ...(status === 'completed' && { completed_at: new Date() })
      }
    });

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction status updated'
    });
  } catch (error) {
    return next(error);
  }
};
