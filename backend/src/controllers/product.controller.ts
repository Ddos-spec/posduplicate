import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all products with filters
 */
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, outlet_id } = req.query;

    const where: any = {
      isActive: true
    };

    if (category) {
      where.category = { name: category as string };
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    const products = await prisma.item.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true }
        },
        variants: {
          where: { isActive: true }
        },
        modifiers: {
          include: {
            modifier: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.item.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        variants: {
          where: { isActive: true }
        },
        modifiers: {
          include: {
            modifier: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with ID ${id} not found`
        }
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productData = req.body;

    const product = await prisma.item.create({
      data: productData
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await prisma.item.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (soft delete)
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.item.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
