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

    const tenantId = req.tenantId; // Get tenantId from middleware
    let outletIds: number[] = [];

    // Tenant isolation - get outlets belonging to this tenant
    if (tenantId) {
      // Get all outlets for this tenant to establish data isolation
      const tenantOutlets = await prisma.outlet.findMany({
        where: { tenantId: tenantId },
        select: { id: true }
      });

      outletIds = tenantOutlets.map(outlet => outlet.id);

      // If user has no outlets, return empty result
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [], count: 0 });
      }

      // Filter by tenant's outlets - only if no specific outlet is requested
      if (!outlet_id) {
        where.outletId = {
          in: outletIds
        };
      }
    }

    if (outlet_id) {
      const requestedOutletId = parseInt(outlet_id as string);
      // If specific outlet is requested, ensure it belongs to the tenant
      if (tenantId && !outletIds.includes(requestedOutletId)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
      where.outletId = requestedOutletId;
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

    const tenantId = req.tenantId; // Get tenantId from middleware

    // Verify transaction belongs to tenant's outlet
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

    // Check if transaction exists and belongs to tenant
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    if (tenantId) {
      // Check if the transaction's outlet belongs to the current tenant
      if (!transaction.outletId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TRANSACTION_OUTLET_MISSING',
            message: 'Transaction outlet information is missing'
          }
        });
      }

      const outlet = await prisma.outlet.findUnique({
        where: { id: transaction.outletId }
      });

      if (!outlet || outlet.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
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
      payments, // Array of { method, amount }
      outletId,
      notes
    } = req.body;

    // Enforce these values on the server-side
    const discountAmount = 0;
    const taxAmount = 0;
    const serviceCharge = 0;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Items are required'
        }
      });
    }

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_ID_REQUIRED',
          message: 'Outlet ID is required'
        }
      });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // Generate transaction number
      const transactionNumber = `TRX-${Date.now()}`;

      // Calculate totals and validate
      let subtotal = 0;
      const itemsWithPrices: any[] = [];

      for (const item of items) {
        const itemData = await tx.items.findUnique({
          where: { id: item.itemId }
        });

        if (!itemData) {
          throw new Error(`Item with ID ${item.itemId} not found`);
        }

        let itemPrice = parseFloat(itemData.price.toString());
        const modifiersData: any[] = [];

        // Add variant price adjustment
        if (item.variantId) {
          const variant = await tx.variants.findUnique({
            where: { id: item.variantId }
          });
          if (variant) {
            itemPrice += parseFloat((variant.price_adjust ?? 0).toString());
          }
        }

        // Add modifiers price
        if (item.modifiers && item.modifiers.length > 0) {
          for (const modifierId of item.modifiers) {
            const modifier = await tx.modifiers.findUnique({
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
          modifiersData,
          trackStock: itemData.trackStock,
        });
      }

      const total = subtotal - discountAmount + taxAmount + serviceCharge;

      // Validate payments
      if (payments && payments.length > 0) {
        const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
        if (totalPaid < total) {
          throw new Error(`Total payment (${totalPaid}) is less than transaction total (${total})`);
        }
      }

      // Create transaction with items
      const transaction = await tx.transaction.create({
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
        if (item.trackStock) {
          await tx.items.update({
            where: { id: item.itemId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
        }

        // Deduct ingredients based on recipe (if recipes feature is enabled)
        try {
          const recipes = await tx.recipes.findMany({
            where: { item_id: item.itemId }
          });

          for (const recipe of recipes) {
            await tx.ingredients.update({
              where: { id: recipe.ingredient_id },
              data: {
                stock: {
                  decrement: parseFloat(recipe.quantity.toString()) * item.quantity
                }
              }
            });
          }
        } catch (error) {
          // Skip recipe-based ingredient deduction if recipes table doesn't exist
          // This is normal if the recipes feature hasn't been set up yet
        }
      }

      return transaction;
    });

    res.status(201).json({
      success: true,
      data: transactionResult,
      message: 'Transaction created successfully'
    });
  } catch (error: any) {
    if (error.message.includes('Item with ID')) {
        return res.status(400).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: error.message } });
    }
    if (error.message.includes('Total payment')) {
        return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_PAYMENT', message: error.message } });
    }
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

    if (!orderData || !orderData.outletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_ID_REQUIRED',
          message: 'Outlet ID is required'
        }
      });
    }

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
