import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';

export const getIngredients = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, category_id } = req.query;
    const where: any = { is_active: true };

    // Filter by tenant - get all outlets for this tenant
    if (req.tenantId) {
      const tenantOutlets = await prisma.outlets.findMany({
        where: { tenant_id: req.tenantId },
        select: { id: true }
      });

      const outletIds = tenantOutlets.map(outlet => outlet.id);

      if (outletIds.length > 0) {
        where.outlet_id = { in: outletIds };
      } else {
        // No outlets for this tenant, return empty
        return res.json({ success: true, data: [], count: 0 });
      }
    }

    // If specific outlet_id is requested, override tenant filter
    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (category_id) {
      where.category_id = parseInt(category_id as string);
    }

    const ingredients = await prisma.ingredients.findMany({
      where,
      include: {
        outlets: { select: { id: true, name: true } },
        categories: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: ingredients, count: ingredients.length });
  } catch (error) {
    return _next(error);
  }
};

export const createIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { name, categoryId, unit, stock, minStock, cost, outletId } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Ingredient name is required' }
      });
    }
    const ingredient = await prisma.ingredients.create({
      data: {
        name,
        category_id: categoryId,
        unit: unit || 'pcs',
        stock: stock || 0,
        min_stock: minStock || 0,
        cost_per_unit: cost || 0,
        outlet_id: outletId
      }
    });
    return res.status(201).json({ success: true, data: ingredient, message: 'Ingredient created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, unit, stock, minStock, cost, isActive } = req.body;
    const ingredient = await prisma.ingredients.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(unit && { unit }),
        ...(stock !== undefined && { stock }),
        ...(minStock !== undefined && { min_stock: minStock }),
        ...(cost !== undefined && { cost_per_unit: cost }),
        ...(isActive !== undefined && { is_active: isActive })
      }
    });
    return res.json({ success: true, data: ingredient, message: 'Ingredient updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.ingredients.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });
    return res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const adjustIngredientStock = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { ingredientId, quantity, type, reason, notes } = req.body;

    if (!ingredientId || !quantity || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Ingredient ID, quantity, and type are required' }
      });
    }

    // Require reason for stock adjustments
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reason is required for stock adjustments' }
      });
    }

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User authentication required for stock adjustment' }
      });
    }

    const ingredient = await prisma.ingredients.findUnique({
      where: { id: parseInt(ingredientId) }
    });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ingredient not found' }
      });
    }

    const oldStock = Number(ingredient.stock);
    const adjustmentQty = parseFloat(quantity);
    const newStock = type === 'in' ? oldStock + adjustmentQty : oldStock - adjustmentQty;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STOCK', message: 'Stock cannot be negative' }
      });
    }

    await prisma.ingredients.update({
      where: { id: parseInt(ingredientId) },
      data: { stock: newStock }
    });

    // Log the activity (non-critical, don't fail if logging fails)
    try {
      await createActivityLog(
        req.userId!,
        type === 'in' ? 'stock_in' : 'stock_out',
        'ingredient',
        ingredient.id,
        { stock: oldStock },
        { stock: newStock },
        `${reason}${notes ? ` - ${notes}` : ''}`,
        req.outletId || ingredient.outlet_id || null
      );
    } catch (logError: any) {
      console.error('Failed to create activity log (non-critical):', logError.message);
      // Continue even if logging fails
    }

    return res.json({
      success: true,
      data: { oldStock, newStock, adjustment: adjustmentQty, type },
      message: `Stock ${type === 'in' ? 'added' : 'removed'} successfully`
    });
  } catch (error: any) {
    console.error('Error in adjustIngredientStock:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Send detailed error for debugging
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to adjust ingredient stock',
        details: error.message
      }
    });
  }
};
