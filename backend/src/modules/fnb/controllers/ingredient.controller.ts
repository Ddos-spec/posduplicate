import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';
import {
  ensureOperationalChangeAccess,
  ensureOperationalReason,
  maybeQueueOperationalChange
} from './changeControl.helpers';

const buildIngredientLogSnapshot = (ingredient: any) => ({
  id: ingredient.id,
  name: ingredient.name,
  unit: ingredient.unit,
  stock: ingredient.stock,
  min_stock: ingredient.min_stock,
  cost_per_unit: ingredient.cost_per_unit,
  outlet_id: ingredient.outlet_id,
  is_active: ingredient.is_active
});

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const assertTenantOutletAccess = async (tenantId: number | undefined, outletId: number | null | undefined) => {
  if (!outletId) {
    return null;
  }

  const outlet = await prisma.outlets.findUnique({
    where: { id: outletId },
    select: { id: true, tenant_id: true }
  });

  if (!outlet || (tenantId && outlet.tenant_id !== tenantId)) {
    return null;
  }

  return outlet;
};

export const getIngredients = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, category_id } = req.query;
    const where: any = { is_active: true };
    let tenantOutletIds: number[] = [];

    // Filter by tenant - get all outlets for this tenant
    if (req.tenantId) {
      const tenantOutlets = await prisma.outlets.findMany({
        where: { tenant_id: req.tenantId },
        select: { id: true }
      });

      tenantOutletIds = tenantOutlets.map(outlet => outlet.id);

      if (tenantOutletIds.length > 0) {
        where.outlet_id = { in: tenantOutletIds };
      } else {
        // No outlets for this tenant, return empty
        return res.json({ success: true, data: [], count: 0 });
      }
    }

    // If specific outlet_id is requested, only allow outlets inside the same tenant.
    if (outlet_id) {
      const parsedOutletId = parseInt(outlet_id as string);

      if (req.tenantId && tenantOutletIds.length > 0 && !tenantOutletIds.includes(parsedOutletId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access to outlet denied' }
        });
      }

      where.outlet_id = parsedOutletId;
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

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet ID is required' }
      });
    }

    const parsedOutletId = parseInt(outletId);
    const outlet = await assertTenantOutletAccess(req.tenantId, parsedOutletId);
    if (!outlet) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access to outlet denied' }
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
        outlet_id: parsedOutletId
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'ingredient_create',
        'ingredient',
        ingredient.id,
        null,
        buildIngredientLogSnapshot(ingredient),
        normalizeReason(req.body.reason, 'Created ingredient'),
        ingredient.outlet_id
      );
    } catch (logError) {
      console.error('Failed to create ingredient activity log:', logError);
    }

    return res.status(201).json({ success: true, data: ingredient, message: 'Ingredient created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, unit, stock, minStock, cost, isActive } = req.body;

    const existingIngredient = await prisma.ingredients.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingIngredient) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ingredient not found' }
      });
    }

    const outlet = await assertTenantOutletAccess(req.tenantId, existingIngredient.outlet_id);
    if (!outlet) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

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

    try {
      await createActivityLog(
        req.userId || 0,
        'ingredient_update',
        'ingredient',
        ingredient.id,
        buildIngredientLogSnapshot(existingIngredient),
        buildIngredientLogSnapshot(ingredient),
        normalizeReason(req.body.reason, 'Updated ingredient'),
        ingredient.outlet_id
      );
    } catch (logError) {
      console.error('Failed to create ingredient activity log:', logError);
    }

    return res.json({ success: true, data: ingredient, message: 'Ingredient updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingIngredient = await prisma.ingredients.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingIngredient) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ingredient not found' }
      });
    }

    const outlet = await assertTenantOutletAccess(req.tenantId, existingIngredient.outlet_id);
    if (!outlet) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    await prisma.ingredients.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'ingredient_delete',
        'ingredient',
        existingIngredient.id,
        buildIngredientLogSnapshot(existingIngredient),
        null,
        normalizeReason(req.body?.reason, 'Soft deleted ingredient'),
        existingIngredient.outlet_id
      );
    } catch (logError) {
      console.error('Failed to create ingredient delete activity log:', logError);
    }

    return res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const adjustIngredientStock = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { ingredientId, quantity, type, reason, notes } = req.body;

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, reason)) {
      return;
    }

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

    const outlet = await assertTenantOutletAccess(req.tenantId, ingredient.outlet_id);
    if (!outlet) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    const actionType = type === 'in' ? 'stock_in' : 'stock_out';
    const currentStock = Number(ingredient.stock);
    const requestedQty = parseFloat(quantity);
    const projectedStock = type === 'in' ? currentStock + requestedQty : currentStock - requestedQty;

    if (projectedStock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STOCK', message: 'Stock cannot be negative' }
      });
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'ingredient',
      actionType,
      entityId: ingredient.id,
      entityLabel: ingredient.name,
      reason,
      payload: {
        ingredientId: ingredient.id,
        quantity: parseFloat(quantity),
        type,
        reason,
        notes: notes || null
      },
      summary: {
        ingredientName: ingredient.name,
        quantity: requestedQty,
        type,
        currentStock,
        projectedStock,
        outletId: ingredient.outlet_id
      },
      message: 'Penyesuaian stok dikirim untuk approval owner.'
    })) {
      return;
    }

    const oldStock = currentStock;
    const adjustmentQty = requestedQty;
    const newStock = projectedStock;

    await prisma.ingredients.update({
      where: { id: parseInt(ingredientId) },
      data: { stock: newStock }
    });

    // Log the activity (non-critical, don't fail if logging fails)
    try {
      await createActivityLog(
        req.userId!,
        actionType,
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
