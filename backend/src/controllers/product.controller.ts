import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all products with filters
 */
export const getProducts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { category, category_id, search, outlet_id } = req.query;
    const tenantId = (req as any).tenantId; // Get tenantId from middleware

    // First, get all outlets for this tenant
    const tenantOutlets = await prisma.outlet.findMany({
      where: { tenantId: tenantId },
      select: { id: true }
    });

    const outletIds = tenantOutlets.map(outlet => outlet.id);

    // If user has no outlets, return empty result
    if (outletIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const where: any = {
      isActive: true,
      outletId: {
        in: outletIds
      }
    };

    if (category_id) {
      where.categoryId = parseInt(category_id as string);
    } else if (category) {
      where.categories = { name: category as string };
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (outlet_id) {
      // Ensure the requested outlet belongs to the current tenant
      const requestedOutletId = parseInt(outlet_id as string);
      if (!outletIds.includes(requestedOutletId)) {
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

    const products = await prisma.items.findMany({
      where,
      include: {
        categories: {
          select: { id: true, name: true }
        },
        variants: {
          where: { is_active: true }
        },
        item_modifiers: {
          include: {
            modifiers: true
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
    return _next(error);
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId; // Get tenantId from middleware

    // First get the tenant's outlets to ensure proper isolation
    const tenantOutlets = await prisma.outlet.findMany({
      where: { tenantId: tenantId },
      select: { id: true }
    });

    const outletIds = tenantOutlets.map(outlet => outlet.id);

    const product = await prisma.items.findUnique({
      where: {
        id: parseInt(id),
        outletId: {
          in: outletIds
        }
      },
      include: {
        categories: true,
        variants: {
          where: { is_active: true }
        },
        item_modifiers: {
          include: {
            modifiers: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with ID ${id} not found or access denied`
        }
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Create new product
 */
export const createProduct = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const productData = req.body;
    const tenantId = (req as any).tenantId; // Get tenantId from middleware

    // Validate that the product's outlet belongs to the current tenant
    const outlet = await prisma.outlet.findUnique({
      where: { id: productData.outletId }
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

    const product = await prisma.items.create({
      data: productData
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Update product
 */
export const updateProduct = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = (req as any).tenantId; // Get tenantId from middleware

    // First verify that the product belongs to a tenant's outlet
    const product = await prisma.items.findUnique({
      where: { id: parseInt(id) }
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

    // Check if the product's outlet belongs to the current tenant
    if (!product.outletId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_OUTLET_MISSING',
          message: 'Product outlet information is missing'
        }
      });
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: product.outletId }
    });

    if (!outlet || outlet.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access to product denied'
        }
      });
    }

    // If updating the outletId, also validate the new outlet
    if (updateData.outletId) {
      const newOutlet = await prisma.outlet.findUnique({
        where: { id: updateData.outletId }
      });

      if (!newOutlet || newOutlet.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
    }

    const updatedProduct = await prisma.items.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Delete product (soft delete)
 */
export const deleteProduct = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId; // Get tenantId from middleware

    // First verify that the product belongs to a tenant's outlet
    const product = await prisma.items.findUnique({
      where: { id: parseInt(id) }
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

    // Check if the product's outlet belongs to the current tenant
    if (!product.outletId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_OUTLET_MISSING',
          message: 'Product outlet information is missing'
        }
      });
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: product.outletId }
    });

    if (!outlet || outlet.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access to product denied'
        }
      });
    }

    await prisma.items.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    return _next(error);
  }
};
