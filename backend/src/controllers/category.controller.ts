import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

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

    const where: any = { isActive: true };

    // Tenant isolation (except Super Admin)
    if (req.tenantId) {
      where.outlets = { tenantId: req.tenantId };
    }

    if (type) {
      where.type = type;
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
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
    if (req.tenantId && category.outletId) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: category.outlet_id }
      });

      if (!outlet || outlet.tenantId !== req.tenantId) {
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

      if (!outlet || outlet.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
    }

    const category = await prisma.categories.create({
      data: {
        name,
        type: type || 'item',
        outlet_id: outletId || null
      }
    });

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
    if (category.outletId) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: category.outlet_id }
      });

      if (!outlet || outlet.tenantId !== tenantId) {
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

      if (!newOutlet || newOutlet.tenantId !== tenantId) {
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

    const updatedCategory = await prisma.categories.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(outletId !== undefined && { outletId })
      }
    });

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
    if (category.outletId) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: category.outlet_id }
      });

      if (!outlet || outlet.tenantId !== tenantId) {
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

    await prisma.categories.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    _next(error);
  }
};
