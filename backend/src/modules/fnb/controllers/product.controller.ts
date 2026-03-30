import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';
import {
  ensureOperationalChangeAccess,
  ensureOperationalReason,
  maybeQueueOperationalChange
} from './changeControl.helpers';

const buildProductLogSnapshot = (product: any) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  category_id: product.category_id,
  outlet_id: product.outlet_id,
  is_active: product.is_active,
  track_stock: product.track_stock,
  stock: product.stock
});

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

/**
 * Get all products with filters
 */
export const getProducts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { category, category_id, search, outlet_id } = req.query;
    const tenantId = (req as any).tenantId; // Get tenantId from middleware

    // Build where clause for products
    const where: any = {
      is_active: true
    };

    let outletIds: number[] = [];

    // First, get all outlets for this tenant
    if (tenantId) {
      const tenantOutlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId },
        select: { id: true }
      });

      outletIds = tenantOutlets.map(outlet => outlet.id);

      // If user has no outlets, return empty result
      if (outletIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }

      where.outlet_id = {
        in: outletIds
      };
    }

    if (category_id) {
      where.category_id = parseInt(category_id as string);
    } else if (category) {
      where.categories = { name: category as string };
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (outlet_id) {
      // Ensure the requested outlet belongs to the current tenant
      const requestedOutletId = parseInt(outlet_id as string);
      if (tenantId && outletIds.length > 0 && !outletIds.includes(requestedOutletId)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }

      where.outlet_id = requestedOutletId;
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
    const tenantOutlets = await prisma.outlets.findMany({
      where: { tenant_id: tenantId },
      select: { id: true }
    });

    const outletIds = tenantOutlets.map(outlet => outlet.id);

    const product = await prisma.items.findFirst({
      where: {
        id: parseInt(id),
        outlet_id: {
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

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, productData.reason)) {
      return;
    }

    // Validate that outletId is provided
    const outletId = productData.outletId ?? productData.outlet_id;
    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUTLET_ID_REQUIRED',
          message: 'Outlet ID is required'
        }
      });
    }

    // Validate that the product's outlet belongs to the current tenant
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

    const {
      categoryId,
      outletId: outletIdInput,
      isActive,
      trackStock,
      minStock,
      priceGofood,
      priceGrabfood,
      priceShopeefood,
      ...rest
    } = productData;
    const createData: any = { ...rest };
    if (categoryId !== undefined) createData.category_id = categoryId;
    if (outletIdInput !== undefined) createData.outlet_id = outletIdInput;
    if (isActive !== undefined) createData.is_active = isActive;
    if (trackStock !== undefined) createData.track_stock = trackStock;
    if (minStock !== undefined) createData.min_stock = minStock;
    if (priceGofood !== undefined) createData.price_gofood = priceGofood;
    if (priceGrabfood !== undefined) createData.price_grabfood = priceGrabfood;
    if (priceShopeefood !== undefined) createData.price_shopeefood = priceShopeefood;

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'product',
      actionType: 'product_create',
      entityLabel: String(productData.name || 'Menu baru'),
      reason: productData.reason,
      payload: productData,
      summary: {
        name: productData.name,
        price: productData.price,
        categoryId: categoryId ?? null,
        outletId
      },
      message: 'Perubahan menu dikirim untuk approval owner.'
    })) {
      return;
    }

    const product = await prisma.items.create({
      data: createData
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'product_create',
        'product',
        product.id,
        null,
        buildProductLogSnapshot(product),
        normalizeReason(productData.reason, 'Created product'),
        product.outlet_id || outletId
      );
    } catch (logError) {
      console.error('Failed to create product activity log:', logError);
    }

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

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, updateData.reason)) {
      return;
    }

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
    if (!product.outlet_id) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_OUTLET_MISSING',
          message: 'Product outlet information is missing'
        }
      });
    }

    const outlet = await prisma.outlets.findUnique({
      where: { id: product.outlet_id }
    });

    if (!outlet || outlet.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access to product denied'
        }
      });
    }

    // If updating the outletId, also validate the new outlet
    const newOutletId = updateData.outletId ?? updateData.outlet_id;
    if (newOutletId) {
      const newOutlet = await prisma.outlets.findUnique({
        where: { id: newOutletId }
      });

      if (!newOutlet || newOutlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
    }

    const {
      categoryId: updateCategoryId,
      outletId: updateOutletId,
      isActive: updateIsActive,
      trackStock: updateTrackStock,
      minStock: updateMinStock,
      priceGofood: updatePriceGofood,
      priceGrabfood: updatePriceGrabfood,
      priceShopeefood: updatePriceShopeefood,
      ...restUpdate
    } = updateData;
    const mappedUpdate: any = { ...restUpdate };
    if (updateCategoryId !== undefined) mappedUpdate.category_id = updateCategoryId;
    if (updateOutletId !== undefined) mappedUpdate.outlet_id = updateOutletId;
    if (updateIsActive !== undefined) mappedUpdate.is_active = updateIsActive;
    if (updateTrackStock !== undefined) mappedUpdate.track_stock = updateTrackStock;
    if (updateMinStock !== undefined) mappedUpdate.min_stock = updateMinStock;
    if (updatePriceGofood !== undefined) mappedUpdate.price_gofood = updatePriceGofood;
    if (updatePriceGrabfood !== undefined) mappedUpdate.price_grabfood = updatePriceGrabfood;
    if (updatePriceShopeefood !== undefined) mappedUpdate.price_shopeefood = updatePriceShopeefood;

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'product',
      actionType: 'product_update',
      entityId: product.id,
      entityLabel: String(updateData.name || product.name || `#${product.id}`),
      reason: updateData.reason,
      payload: {
        ...updateData,
        id: product.id
      },
      summary: {
        name: updateData.name || product.name,
        price: updateData.price ?? product.price,
        changes: Object.keys(mappedUpdate),
        outletId: newOutletId ?? product.outlet_id
      },
      message: 'Perubahan menu dikirim untuk approval owner.'
    })) {
      return;
    }

    const updatedProduct = await prisma.items.update({
      where: { id: parseInt(id) },
      data: mappedUpdate
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'product_update',
        'product',
        updatedProduct.id,
        buildProductLogSnapshot(product),
        buildProductLogSnapshot(updatedProduct),
        normalizeReason(updateData.reason, 'Updated product'),
        updatedProduct.outlet_id || product.outlet_id
      );
    } catch (logError) {
      console.error('Failed to create product activity log:', logError);
    }

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

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body?.reason)) {
      return;
    }

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
    if (!product.outlet_id) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_OUTLET_MISSING',
          message: 'Product outlet information is missing'
        }
      });
    }

    const outlet = await prisma.outlets.findUnique({
      where: { id: product.outlet_id }
    });

    if (!outlet || outlet.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access to product denied'
        }
      });
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'product',
      actionType: 'product_delete',
      entityId: product.id,
      entityLabel: product.name,
      reason: req.body.reason,
      payload: {
        id: product.id,
        reason: req.body.reason
      },
      summary: {
        name: product.name,
        price: product.price,
        outletId: product.outlet_id
      },
      message: 'Permintaan hapus menu dikirim untuk approval owner.'
    })) {
      return;
    }

    await prisma.items.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'product_delete',
        'product',
        product.id,
        buildProductLogSnapshot(product),
        null,
        normalizeReason(req.body?.reason, 'Soft deleted product'),
        product.outlet_id
      );
    } catch (logError) {
      console.error('Failed to create product activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    return _next(error);
  }
};
