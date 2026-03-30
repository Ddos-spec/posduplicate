import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';
import {
  ensureOperationalChangeAccess,
  ensureOperationalReason,
  maybeQueueOperationalChange
} from './changeControl.helpers';

const buildCategoryLogSnapshot = (category: any) => ({
  id: category.id,
  name: category.name,
  type: category.type,
  outlet_id: category.outlet_id,
  is_active: category.is_active
});

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

/**
 * Get all categories
 */
export const getCategories = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { type, outlet_id } = req.query;

    const where: any = { is_active: true };

    // Tenant isolation (except Super Admin)
    if (req.tenantId) {
      where.outlets = { tenant_id: req.tenantId };
    }

    if (type) {
      where.type = type;
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    const categories = await prisma.categories.findMany({
      where,
      include: {
        outlets: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            items: true,
            ingredients: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;

    const category = await prisma.categories.findUnique({
      where: { id: parseInt(id) },
      include: {
        outlets: true,
        items: true,
        ingredients: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // Tenant isolation check
    const categoryOutletId = category.outlet_id;
    if (req.tenantId && categoryOutletId !== null) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: categoryOutletId }
      });

      if (!outlet || outlet.tenant_id !== req.tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Create category
 */
export const createCategory = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { name, type, outletId } = req.body;
    const tenantId = req.tenantId; // Get tenantId from middleware

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body.reason)) {
      return;
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category name is required'
        }
      });
    }

    // Validate that the outlet belongs to the current tenant
    if (outletId) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: outletId }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'category',
      actionType: 'category_create',
      entityLabel: String(name),
      reason: req.body.reason,
      payload: req.body,
      summary: {
        name,
        type: type || 'item',
        outletId: outletId || null
      },
      message: 'Permintaan kategori baru dikirim untuk approval owner.'
    })) {
      return;
    }

    const category = await prisma.categories.create({
      data: {
        name,
        type: type || 'item',
        outlet_id: outletId || null
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'category_create',
        'category',
        category.id,
        null,
        buildCategoryLogSnapshot(category),
        normalizeReason(req.body.reason, 'Created category'),
        category.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create category activity log:', logError);
    }

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Update category
 */
export const updateCategory = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, isActive, outletId } = req.body;
    const tenantId = req.tenantId; // Get tenantId from middleware

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body.reason)) {
      return;
    }

    // Verify the category belongs to tenant's outlet
    const category = await prisma.categories.findUnique({
      where: { id: parseInt(id) }
    });

    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
      return;
    }

    // Check if the category's outlet belongs to the current tenant
    const existingOutletId = category.outlet_id;
    if (existingOutletId !== null) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: existingOutletId }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
        return;
      }
    }

    // If updating outletId, validate the new outlet
    if (outletId !== undefined) {
      const newOutlet = await prisma.outlets.findUnique({
        where: { id: outletId }
      });

      if (!newOutlet || newOutlet.tenant_id !== tenantId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
        return;
      }
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'category',
      actionType: 'category_update',
      entityId: category.id,
      entityLabel: String(name || category.name || `#${category.id}`),
      reason: req.body.reason,
      payload: {
        ...req.body,
        id: category.id
      },
      summary: {
        name: name || category.name,
        type: type || category.type,
        changes: ['name', 'type', 'isActive', 'outletId'].filter((key) => req.body[key] !== undefined),
        outletId: outletId ?? category.outlet_id ?? null
      },
      message: 'Perubahan kategori dikirim untuk approval owner.'
    })) {
      return;
    }

    const updatedCategory = await prisma.categories.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(outletId !== undefined && { outlet_id: outletId })
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'category_update',
        'category',
        updatedCategory.id,
        buildCategoryLogSnapshot(category),
        buildCategoryLogSnapshot(updatedCategory),
        normalizeReason(req.body.reason, 'Updated category'),
        updatedCategory.outlet_id || category.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create category update log:', logError);
    }

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    _next(error);
  }
};

/**
 * Delete category (soft delete)
 */
export const deleteCategory = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId; // Get tenantId from middleware

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body?.reason)) {
      return;
    }

    // Verify the category belongs to tenant's outlet
    const category = await prisma.categories.findUnique({
      where: { id: parseInt(id) }
    });

    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
      return;
    }

    // Check if the category's outlet belongs to the current tenant
    const deleteOutletId = category.outlet_id;
    if (deleteOutletId !== null) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: deleteOutletId }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
        return;
      }
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'category',
      actionType: 'category_delete',
      entityId: category.id,
      entityLabel: category.name,
      reason: req.body.reason,
      payload: {
        id: category.id,
        reason: req.body.reason
      },
      summary: {
        name: category.name,
        type: category.type,
        outletId: category.outlet_id ?? null
      },
      message: 'Permintaan hapus kategori dikirim untuk approval owner.'
    })) {
      return;
    }

    await prisma.categories.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'category_delete',
        'category',
        category.id,
        buildCategoryLogSnapshot(category),
        null,
        normalizeReason(req.body?.reason, 'Soft deleted category'),
        category.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create category delete log:', logError);
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    _next(error);
  }
};
