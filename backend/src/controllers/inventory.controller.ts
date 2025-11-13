import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id, low_stock } = req.query;
    const where: any = { isActive: true };

    if (req.tenantId) {
      where.outlet = { tenantId: req.tenantId };
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (low_stock === 'true') {
      where.trackStock = true;
      where.stock = { lte: prisma.item.fields.minStock };
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        category: true,
        outlet: { select: { id: true, name: true } }
      },
      orderBy: { stock: 'asc' }
    });

    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, quantity, type, notes, outletId } = req.body;

    if (!itemId || !quantity || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Item ID, quantity, and type are required' }
      });
    }

    // Get current stock
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
      });
    }

    const currentStock = parseFloat(item.stock.toString());
    const adjustment = parseFloat(quantity);
    const newStock = type === 'in' ? currentStock + adjustment : currentStock - adjustment;

    // Update stock
    await prisma.item.update({
      where: { id: itemId },
      data: { stock: newStock }
    });

    // Record movement
    await prisma.inventoryMovement.create({
      data: {
        itemId,
        type,
        quantity: adjustment,
        stockBefore: currentStock,
        stockAfter: newStock,
        notes,
        outletId,
        userId: req.userId
      }
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: { itemId, stockBefore: currentStock, stockAfter: newStock }
    });
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { item_id, outlet_id, date_from, date_to } = req.query;
    const where: any = {};

    if (req.tenantId) {
      where.outlet = { tenantId: req.tenantId };
    }

    if (item_id) {
      where.itemId = parseInt(item_id as string);
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) where.createdAt.lte = new Date(date_to as string);
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = {
      isActive: true,
      trackStock: true
    };

    if (req.tenantId) {
      where.outlet = { tenantId: req.tenantId };
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    const items = await prisma.$queryRaw`
      SELECT * FROM items
      WHERE is_active = true
      AND track_stock = true
      AND stock <= min_stock
      ${outlet_id ? prisma.$queryRawUnsafe(`AND outlet_id = ${outlet_id}`) : prisma.$queryRawUnsafe('')}
      ORDER BY stock ASC
    `;

    res.json({ success: true, data: items, count: (items as any[]).length });
  } catch (error) {
    // Fallback to regular query
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        trackStock: true,
        ...(outlet_id && { outletId: parseInt(outlet_id as string) })
      },
      include: {
        category: true
      },
      orderBy: { stock: 'asc' }
    });

    const lowStock = items.filter(item =>
      parseFloat(item.stock.toString()) <= parseFloat(item.minStock.toString())
    );

    res.json({ success: true, data: lowStock, count: lowStock.length });
  }
};
