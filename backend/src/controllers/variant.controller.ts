import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getVariants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { item_id } = req.query;
    const where: any = { isActive: true };
    if (item_id) where.itemId = parseInt(item_id as string);

    const variants = await prisma.variants.findMany({
      where,
      include: { item: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: variants, count: variants.length });
  } catch (error) {
    next(error);
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
    const variant = await prisma.variants.create({
      data: { name, itemId, priceAdjust: priceAdjust || 0, sku }
    });
    res.status(201).json({ success: true, data: variant, message: 'Variant created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, priceAdjust, sku, isActive } = req.body;
    const variant = await prisma.variants.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(priceAdjust !== undefined && { priceAdjust }),
        ...(sku && { sku }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.json({ success: true, data: variant, message: 'Variant updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.variants.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    next(error);
  }
};
