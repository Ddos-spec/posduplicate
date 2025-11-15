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
      where.outlet = { tenantId: req.tenantId };
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
        outlet: {
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
        outlet: true,
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
    if (req.tenantId && category.outlet?.tenantId !== req.tenantId) {
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
      data: category
    });
  } catch (error) {
    _next(error);
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

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category name is required'
        }
      });
    }

    const category = await prisma.categories.create({
      data: {
        name,
        type: type || 'item',
        outletId: outletId || null
      }
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Update category
 */
export const updateCategory = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, type, isActive } = req.body;

    const category = await prisma.categories.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
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
) => {
  try {
    const { id } = req.params;

    await prisma.categories.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    _next(error);
  }
};
