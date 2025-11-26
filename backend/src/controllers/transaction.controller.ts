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
        // Allow small floating point difference (e.g., 0.5)
        if (totalPaid < total - 0.5) {
          throw new Error(`Total payment (${totalPaid}) is less than transaction total (${total})`);
        }
      }

      // Create transaction with items
      const transaction = await tx.transaction.create({
        data: {
          transaction_number: transactionNumber,
          order_type: orderType,
          table_id: tableId ? parseInt(tableId) : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          subtotal,
          discountAmount,
          taxAmount,
          service_charge: serviceCharge,
          total,
          status: 'completed',
          outletId: parseInt(outletId),
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

    // Get existing transaction with items
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        transaction_items: {
          include: {
            items: true
          }
        }
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' }
      });
    }

    // If cancelling a completed transaction, restore stock
    if (status === 'cancelled' && existingTransaction.status === 'completed') {
      for (const transactionItem of existingTransaction.transaction_items) {
        const item = transactionItem.items;
        const quantity = parseFloat(transactionItem.quantity.toString());

        // Restore product stock if tracking
        if (item.trackStock) {
          await prisma.items.update({
            where: { id: item.id },
            data: {
              stock: {
                increment: quantity
              }
            }
          });
        }
      }
    }

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
      message: status === 'cancelled' ? 'Transaction cancelled and stock restored' : 'Transaction status updated'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete transaction permanently
 */
export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Get transaction with outlet info for tenant validation
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        outlets: true,
        transaction_items: {
          include: {
            items: true
          }
        }
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

    // Verify tenant ownership
    if (tenantId && transaction.outlets) {
      if (transaction.outlets.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
    }

    // If transaction was completed, restore stock before deleting
    if (transaction.status === 'completed') {
      for (const transactionItem of transaction.transaction_items) {
        const item = transactionItem.items;
        const quantity = parseFloat(transactionItem.quantity.toString());

        // Restore product stock if tracking
        if (item.trackStock) {
          await prisma.items.update({
            where: { id: item.id },
            data: {
              stock: {
                increment: quantity
              }
            }
          });
        }
      }
    }

    // Delete transaction (cascade delete will handle related records)
    await prisma.transaction.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully and stock restored'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get today's report (for cashiers)
 */
export const getTodayReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const tenantId = req.tenantId;

    // Get start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get outlet IDs for this tenant
    let outletIds: number[] = [];
    if (tenantId) {
      const tenantOutlets = await prisma.outlet.findMany({
        where: { tenantId: tenantId },
        select: { id: true }
      });
      outletIds = tenantOutlets.map(outlet => outlet.id);
    }

    // Get today's transactions for this cashier
    const transactions = await prisma.transaction.findMany({
      where: {
        cashier_id: userId,
        status: 'completed',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        ...(outletIds.length > 0 && {
          outletId: {
            in: outletIds
          }
        })
      },
      include: {
        transaction_items: {
          include: {
            items: true,
            transaction_modifiers: true
          }
        },
        payments: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Calculate statistics
    const totalTransactions = transactions.length;
    const totalSales = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0);

    // Payment method breakdown
    const paymentMethods = transactions.reduce((acc: any, transaction) => {
      transaction.payments.forEach((payment: any) => {
        const method = payment.method;
        if (!acc[method]) {
          acc[method] = {
            count: 0,
            total: 0
          };
        }
        acc[method].count += 1;
        acc[method].total += Number(payment.amount || 0);
      });
      return acc;
    }, {});

    // Top selling items
    const itemSales: any = {};
    transactions.forEach(transaction => {
      transaction.transaction_items.forEach((item: any) => {
        const itemId = item.item_id;
        if (!itemSales[itemId]) {
          itemSales[itemId] = {
            id: itemId,
            name: item.item_name,
            quantity: 0,
            total: 0
          };
        }
        itemSales[itemId].quantity += Number(item.quantity || 0);
        itemSales[itemId].total += Number(item.subtotal || 0);
      });
    });

    const topItems = Object.values(itemSales)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        date: startOfDay,
        cashier: transactions[0]?.users || null,
        summary: {
          totalTransactions,
          totalSales,
          averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0
        },
        paymentMethods,
        topItems,
        transactions
      }
    });
  } catch (error) {
    return next(error);
  }
};
