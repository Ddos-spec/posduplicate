import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { safeParseInt } from '../../../utils/validation';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';

const getTenantOutletIds = async (tenantId: number | undefined): Promise<number[]> => {
  if (!tenantId) return [];
  const outlets = await prisma.outlets.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  return outlets.map((outlet) => outlet.id);
};

const buildVariantLogSnapshot = (variant: any) => ({
  id: variant.id,
  name: variant.name,
  item_id: variant.item_id,
  price_adjust: variant.price_adjust,
  sku: variant.sku,
  is_active: variant.is_active
});

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

export const getVariants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { item_id } = req.query;
    const where: any = { is_active: true };

    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [], count: 0 });
      }
      where.items = {
        outlet_id: { in: outletIds }
      };
    }

    if (item_id) {
      where.item_id = parseInt(item_id as string);
    }

    const variants = await prisma.variants.findMany({
      where,
      include: { items: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: variants, count: variants.length });
  } catch (error) {
    return next(error);
  }
};

export const createVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, itemId, priceAdjust, sku } = req.body;
    if (!name || !itemId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and item ID are required' }
      });
    }

    const parsedItemId = safeParseInt(itemId);
    const item = await prisma.items.findUnique({
      where: { id: parsedItemId },
      include: { outlets: true }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found' }
      });
    }

    if (req.tenantId && item.outlets && item.outlets.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    const variant = await prisma.variants.create({
      data: { name, item_id: parsedItemId, price_adjust: priceAdjust || 0, sku }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'variant_create',
        'variant',
        variant.id,
        null,
        {
          ...buildVariantLogSnapshot(variant),
          name: `${item.name} - ${variant.name}`
        },
        normalizeReason(req.body.reason, 'Created variant'),
        item.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create variant activity log:', logError);
    }

    res.status(201).json({ success: true, data: variant, message: 'Variant created successfully' });
  } catch (error) {
    return next(error);
  }
};

export const updateVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, priceAdjust, sku, isActive } = req.body;

    const existing = await prisma.variants.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            outlets: true
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Variant not found' }
      });
    }

    if (req.tenantId && existing.items?.outlets && existing.items.outlets.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    const variant = await prisma.variants.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(priceAdjust !== undefined && { price_adjust: priceAdjust }),
        ...(sku && { sku }),
        ...(isActive !== undefined && { is_active: isActive })
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'variant_update',
        'variant',
        variant.id,
        {
          ...buildVariantLogSnapshot(existing),
          name: `${existing.items?.name || 'Item'} - ${existing.name}`
        },
        {
          ...buildVariantLogSnapshot(variant),
          name: `${existing.items?.name || 'Item'} - ${variant.name}`
        },
        normalizeReason(req.body.reason, 'Updated variant'),
        existing.items?.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create variant update log:', logError);
    }

    res.json({ success: true, data: variant, message: 'Variant updated successfully' });
  } catch (error) {
    return next(error);
  }
};

export const deleteVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.variants.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            outlets: true
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Variant not found' }
      });
    }

    if (req.tenantId && existing.items?.outlets && existing.items.outlets.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
    }

    await prisma.variants.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'variant_delete',
        'variant',
        existing.id,
        {
          ...buildVariantLogSnapshot(existing),
          name: `${existing.items?.name || 'Item'} - ${existing.name}`
        },
        null,
        normalizeReason(req.body?.reason, 'Soft deleted variant'),
        existing.items?.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create variant delete log:', logError);
    }

    res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
