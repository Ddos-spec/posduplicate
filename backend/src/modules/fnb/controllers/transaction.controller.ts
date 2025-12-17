import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { generateJournalFromPOSTransaction } from '../../../services/autoJournal.service';

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

    // Get tenant's outlets for isolation
    let outletIds: number[] = [];
    if (req.tenantId) {
      const tenantOutlets = await prisma.outlets.findMany({
        where: { tenant_id: req.tenantId },
        select: { id: true }
      });
      outletIds = tenantOutlets.map(outlet => outlet.id);
    }

    // SAFE FILTER MODE:
    // 1. Always filter by current cashier (User ID)
    const where: any = {
      cashier_id: req.userId
    };

    // 2. Apply Tenant Isolation via Outlet IDs
    if (outletIds.length > 0) {
      where.outlet_id = { in: outletIds };
    }

    // 3. Apply Date Filter if provided
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        const fromDate = new Date(date_from as string);
        fromDate.setHours(0, 0, 0, 0);
        // Adjust for Timezone (assuming UTC+7 / WIB):
        // 00:00 WIB is 17:00 UTC previous day.
        fromDate.setHours(fromDate.getHours() - 7);
        where.created_at.gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to as string);
        // Safety buffer: +1 day to handle timezone differences
        toDate.setDate(toDate.getDate() + 1);
        toDate.setHours(23, 59, 59, 999);
        where.created_at.lte = toDate;
      }
    }

    // 4. Apply Status Filter if provided
    if (status) {
      where.status = status;
    }

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        outlets: { select: { id: true, name: true } },
        tables: { select: { id: true, name: true } },
        users: { select: { id: true, name: true, email: true } },
        transaction_items: {
          include: {
            items: true,
            variants: true,
            transaction_modifiers: { include: { modifiers: true } }
          }
        },
        payments: true
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
      debug: {
        serverTime: new Date().toISOString(),
        status: "SAFE FILTER MODE - TENANT ISOLATION ENABLED",
        queryParams: { status, outlet_id, date_from, date_to },
        constructedWhere: JSON.parse(JSON.stringify(where, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ))
      }
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
    const transaction = await prisma.transactions.findUnique({
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
      if (!transaction.outlet_id) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TRANSACTION_OUTLET_MISSING',
            message: 'Transaction outlet information is missing'
          }
        });
      }

      const outlet = await prisma.outlets.findUnique({
        where: { id: transaction.outlet_id }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
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

    // Validate required fields
    if (!orderType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Order type is required'
        }
      });
    }

    // Validate order type value
    if (!['dine_in', 'takeaway', 'delivery'].includes(orderType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order type. Must be one of: dine_in, takeaway, delivery'
        }
      });
    }

    console.log(`[CreateTransaction] Starting for Outlet ${outletId}, Items: ${items?.length}`);

    // Validate Outlet Ownership (Tenant Isolation)
    if (req.tenantId) {
      const outlet = await prisma.outlets.findFirst({
        where: {
          id: parseInt(outletId),
          tenant_id: req.tenantId
        }
      });

      if (!outlet) {
        console.error(`[CreateTransaction] Security Alert: Outlet ${outletId} does not belong to Tenant ${req.tenantId}`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to create transactions for this outlet'
          }
        });
      }
    }

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

      // Determine pricing tier based on payment method
      // We assume the first payment method dictates the pricing tier for the whole order
      const primaryPaymentMethod = payments && payments.length > 0 ? payments[0].method : 'cash';

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

        // Determine base price based on payment method/platform
        let itemPrice = parseFloat(itemData.price.toString()); // Default to standard price
        
        // Override with platform specific price if available
        if (primaryPaymentMethod === 'gofood' && itemData.price_gofood) {
          itemPrice = parseFloat(itemData.price_gofood.toString());
        } else if (primaryPaymentMethod === 'grabfood' && itemData.price_grabfood) {
          itemPrice = parseFloat(itemData.price_grabfood.toString());
        } else if (primaryPaymentMethod === 'shopeefood' && itemData.price_shopeefood) {
          itemPrice = parseFloat(itemData.price_shopeefood.toString());
        }

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
          trackStock: itemData.track_stock,
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
      console.log(`[CreateTransaction] Creating transaction record ${transactionNumber}... CashierID: ${req.userId}`);

      const transaction = await tx.transactions.create({
        data: {
          transaction_number: transactionNumber,
          order_type: orderType,
          table_id: tableId ? parseInt(tableId) : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          service_charge: serviceCharge,
          total,
          status: 'completed',
          outlet_id: parseInt(outletId),
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

      console.log(`[CreateTransaction] Transaction ${transaction.id} created successfully. Number: ${transaction.transaction_number}, CreatedAt: ${transaction.created_at}, OutletId: ${transaction.outlet_id}`);

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

        // Deduct ingredients based on recipe (DISABLED: recipes table missing in DB)
        /*
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
          console.warn('Skipping recipe deduction:', error);
        }
        */
      }

      return transaction;
    });

    // Auto-Journal Hook
    // Fire and forget (don't await to block response)
    generateJournalFromPOSTransaction(transactionResult.id).catch(err => {
        console.error('Auto-journal hook failed:', err);
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

    const orderOutletId = orderData?.outletId ?? orderData?.outlet_id;
    if (!orderData || !orderOutletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_ID_REQUIRED',
          message: 'Outlet ID is required'
        }
      });
    }

    // Validate order type if provided
    if (orderData.orderType && !['dine_in', 'takeaway', 'delivery'].includes(orderData.orderType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order type. Must be one of: dine_in, takeaway, delivery'
        }
      });
    }

    // Store as pending transaction instead of separate table
    const transactionNumber = `HOLD-${Date.now()}`;

    const heldOrder = await prisma.transactions.create({
      data: {
        transaction_number: transactionNumber,
        order_type: orderData.orderType || 'dine_in',
        table_id: orderData.tableId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        subtotal: orderData.subtotal || 0,
        discount_amount: orderData.discountAmount || 0,
        tax_amount: orderData.taxAmount || 0,
        service_charge: orderData.serviceCharge || 0,
        total: orderData.total || 0,
        status: 'pending',
        outlet_id: orderOutletId,
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
    const heldOrders = await prisma.transactions.findMany({
      where: {
        cashier_id: req.userId,
        status: 'pending'
      },
      orderBy: { created_at: 'desc' }
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
    const existingTransaction = await prisma.transactions.findUnique({
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
        if (item.track_stock) {
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

    const transaction = await prisma.transactions.update({
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
    const transaction = await prisma.transactions.findUnique({
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
      if (transaction.outlets.tenant_id !== tenantId) {
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
        if (item.track_stock) {
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
    await prisma.transactions.delete({
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
    // Adjust for Timezone (assuming UTC+7 / WIB):
    startOfDay.setHours(startOfDay.getHours() - 7);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get outlet IDs for this tenant
    let outletIds: number[] = [];
    if (tenantId) {
      const tenantOutlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId },
        select: { id: true }
      });
      outletIds = tenantOutlets.map(outlet => outlet.id);
    }

    // Get today's transactions for this cashier
    const transactions = await prisma.transactions.findMany({
      where: {
        cashier_id: userId,
        status: 'completed',
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        },
        ...(outletIds.length > 0 && {
          outlet_id: {
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
        created_at: 'asc'
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
