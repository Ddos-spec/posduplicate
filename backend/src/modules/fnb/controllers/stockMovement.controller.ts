import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';

// Get all stock movements with filters
export const getStockMovements = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, type, ingredient_id, inventory_id, item_id, supplier_id, date_from, date_to, limit = '100' } = req.query;
    const where: any = {};

    // Tenant isolation via outlet
    if (req.tenantId) {
      where.outlets = { tenant_id: req.tenantId };
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (item_id) {
      where.item_id = parseInt(item_id as string);
    }

    if (type) {
      where.type = type as string;
    }

    if (ingredient_id) {
      where.ingredient_id = parseInt(ingredient_id as string);
    }

    if (inventory_id) {
      where.inventory_id = parseInt(inventory_id as string);
    }

    if (supplier_id) {
      where.supplier_id = parseInt(supplier_id as string);
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) where.created_at.lte = new Date(date_to as string);
    }

    const movements = await prisma.stock_movements.findMany({
      where,
      include: {
        users: { select: { id: true, name: true } },
        items: { select: { id: true, name: true } },
        ingredients: { select: { id: true, name: true, unit: true } },
        inventory: { select: { id: true, name: true, unit: true } },
        outlets: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    return _next(error);
  }
};

// Get single stock movement
export const getStockMovement = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const movement = await prisma.stock_movements.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: { select: { id: true, name: true } },
        ingredients: { select: { id: true, name: true, unit: true } },
        inventory: { select: { id: true, name: true, unit: true } },
        outlets: { select: { id: true, name: true } },
      }
    });

    if (!movement) {
      return res.status(404).json({
        success: false,
        error: { code: 'MOVEMENT_NOT_FOUND', message: 'Stock movement not found' }
      });
    }

    res.json({ success: true, data: movement });
  } catch (error) {
    return _next(error);
  }
};

// Create stock movement (IN/OUT/ADJUST)
export const createStockMovement = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      outletId,
      ingredientId,
      inventoryId,
      type,
      quantity,
      unitPrice,
      supplierId,
      supplier,
      invoiceNumber,
      notes
    } = req.body;

    // Validation
    if (!outletId || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet ID, type, and quantity are required' }
      });
    }

    if (!ingredientId && !inventoryId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Either ingredient ID or inventory ID is required' }
      });
    }

    if (!['IN', 'OUT', 'ADJUST'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Type must be IN, OUT, or ADJUST' }
      });
    }

    // Get current stock
    let currentStock = 0;
    let targetName = '';
    let targetUnit = '';

    if (ingredientId) {
      const ingredient = await prisma.ingredients.findUnique({ where: { id: ingredientId } });
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          error: { code: 'INGREDIENT_NOT_FOUND', message: 'Ingredient not found' }
        });
      }
      currentStock = parseFloat((ingredient.stock || 0).toString());
      targetName = ingredient.name;
      targetUnit = ingredient.unit;
    } else if (inventoryId) {
      const inventory = await prisma.inventory.findUnique({ where: { id: inventoryId } });
      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: { code: 'INVENTORY_NOT_FOUND', message: 'Inventory not found' }
        });
      }
      currentStock = parseFloat((inventory.current_stock || 0).toString());
      targetName = inventory.name;
      targetUnit = inventory.unit;
    }

    // Calculate new stock
    const qty = parseFloat(quantity);
    let newStock = currentStock;

    if (type === 'IN') {
      newStock = currentStock + qty;
    } else if (type === 'OUT') {
      newStock = currentStock - qty;
    } else if (type === 'ADJUST') {
      newStock = qty; // ADJUST sets absolute value
    }

    // Prevent negative stock
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STOCK', message: 'Stock tidak boleh negatif' }
      });
    }

    // Calculate total cost
    const price = parseFloat(unitPrice || 0);
    const totalCost = qty * price;

    // Create stock movement record
    const movement = await prisma.stock_movements.create({
      data: {
        outlet_id: parseInt(outletId),
        ingredient_id: ingredientId ? parseInt(ingredientId) : null,
        inventory_id: inventoryId ? parseInt(inventoryId) : null,
        type,
        quantity: qty,
        unit_price: price,
        total_cost: totalCost,
        stock_before: currentStock,
        stock_after: newStock,
        supplier: supplier || null,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        invoice_number: invoiceNumber || null,
        notes: notes || null,
        user_id: req.userId || 0
      },
      include: {
        users: { select: { id: true, name: true } },
        ingredients: { select: { id: true, name: true, unit: true } },
        inventory: { select: { id: true, name: true, unit: true } },
        outlets: { select: { id: true, name: true } },
      }
    });

    // Update stock in ingredient/inventory
    if (ingredientId) {
      await prisma.ingredients.update({
        where: { id: ingredientId },
        data: {
          stock: newStock,
          ...(type === 'IN' && price > 0 && { cost_per_unit: price }) // Update cost when stock IN
        }
      });
    } else if (inventoryId) {
      await prisma.inventory.update({
        where: { id: inventoryId },
        data: {
          current_stock: newStock,
          ...(type === 'IN' && price > 0 && { cost_amount: price }) // Update cost when stock IN
        }
      });
    }

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        `stock_${type.toLowerCase()}`,
        ingredientId ? 'ingredient' : 'inventory',
        ingredientId || inventoryId || 0,
        { stock: currentStock, name: targetName },
        { stock: newStock, quantity: qty, unitPrice: price, totalCost },
        notes || `Stock ${type}`,
        outletId
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    // Create expense record if type is IN (purchase)
    if (type === 'IN' && totalCost > 0) {
      try {
        await prisma.expenses.create({
          data: {
            outlet_id: parseInt(outletId),
            expense_type: 'STOCK_PURCHASE',
            category: 'Pembelian Bahan Baku',
            amount: totalCost,
            description: `Pembelian ${targetName} ${qty} ${targetUnit}`,
            payment_method: 'cash', // default
            reference_id: movement.id,
            supplier_id: supplierId ? parseInt(supplierId) : null,
            invoice_number: invoiceNumber || null,
            paid_at: new Date(),
            user_id: req.userId || 0
          }
        });
      } catch (expenseError) {
        console.error('Failed to create expense record:', expenseError);
      }
    }

    res.json({
      success: true,
      message: 'Stock movement created successfully',
      data: movement
    });
  } catch (error) {
    return _next(error);
  }
};

// Delete stock movement (with rollback)
export const deleteStockMovement = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reason for deletion is required' }
      });
    }

    const movement = await prisma.stock_movements.findUnique({ where: { id: parseInt(id) } });

    if (!movement) {
      return res.status(404).json({
        success: false,
        error: { code: 'MOVEMENT_NOT_FOUND', message: 'Stock movement not found' }
      });
    }

    // Rollback stock
    if (movement.ingredient_id) {
      const ingredient = await prisma.ingredients.findUnique({ where: { id: movement.ingredient_id } });
      if (ingredient) {
        await prisma.ingredients.update({
          where: { id: movement.ingredient_id },
          data: { stock: movement.stock_before }
        });
      }
    } else if (movement.inventory_id) {
      const inventory = await prisma.inventory.findUnique({ where: { id: movement.inventory_id } });
      if (inventory) {
        await prisma.inventory.update({
          where: { id: movement.inventory_id },
          data: { current_stock: movement.stock_before }
        });
      }
    }

    // Delete movement
    await prisma.stock_movements.delete({ where: { id: parseInt(id) } });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'stock_movement_delete',
        'stock_movement',
        parseInt(id),
        movement,
        null,
        reason,
        movement.outlet_id
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Stock movement deleted and stock rolled back successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

// Get stock movement summary/statistics
export const getStockMovementSummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to } = req.query;
    const where: any = {};

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) where.created_at.lte = new Date(date_to as string);
    }

    // Get total expenses by type
    const inMovements = await prisma.stock_movements.aggregate({
      where: { ...where, type: 'IN' },
      _sum: { total_cost: true },
      _count: true
    });

    const outMovements = await prisma.stock_movements.aggregate({
      where: { ...where, type: 'OUT' },
      _sum: { total_cost: true },
      _count: true
    });

    const adjustMovements = await prisma.stock_movements.aggregate({
      where: { ...where, type: 'ADJUST' },
      _count: true
    });

    res.json({
      success: true,
      data: {
        stockIn: {
          count: inMovements._count || 0,
          totalCost: parseFloat((inMovements._sum?.total_cost || 0).toString())
        },
        stockOut: {
          count: outMovements._count || 0,
          totalCost: parseFloat((outMovements._sum?.total_cost || 0).toString())
        },
        stockAdjust: {
          count: adjustMovements._count || 0
        },
        totalExpense: parseFloat((inMovements._sum?.total_cost || 0).toString())
      }
    });
  } catch (error) {
    return _next(error);
  }
};
