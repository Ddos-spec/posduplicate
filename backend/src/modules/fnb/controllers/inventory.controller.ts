import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';

export const getInventory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, low_stock } = req.query;
    const where: any = { is_active: true };

    if (req.tenantId) {
      where.outlets = { tenant_id: req.tenantId };
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (low_stock === 'true') {
      where.track_stock = true;
      // Correct approach for comparing stock to min_stock
    }

    const items = await prisma.items.findMany({
      where,
      include: {
        outlets: { select: { id: true, name: true } }
      },
      orderBy: { stock: 'asc' }
    });

    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    return _next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { itemId, quantity, type, reason, notes } = req.body;

    if (!itemId || !quantity || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Item ID, quantity, and type are required' }
      });
    }

    // Require reason for stock adjustments
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Alasan penyesuaian stok wajib diisi' }
      });
    }

    // Get current stock
    const item = await prisma.items.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Item not found' }
      });
    }

    const currentStock = parseFloat((item.stock || 0).toString());
    const adjustment = parseFloat(quantity);
    const newStock = type === 'in' ? currentStock + adjustment : currentStock - adjustment;

    // Prevent negative stock
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STOCK', message: 'Stock tidak boleh negatif' }
      });
    }

    // Update stock
    await prisma.items.update({
      where: { id: itemId },
      data: { stock: newStock }
    });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        type === 'in' ? 'stock_increase' : 'stock_decrease',
        'item',
        itemId,
        {
          stock: currentStock,
          name: item.name,
        },
        {
          stock: newStock,
          adjustment: adjustment,
          type: type,
          notes: notes || null,
        },
        reason,
        req.outletId
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
      // Continue even if logging fails
    }

    res.json({
      success: true,
      message: 'Stock berhasil disesuaikan',
      data: {
        itemId,
        itemName: item.name,
        stockBefore: currentStock,
        stockAfter: newStock,
        adjustment: adjustment,
        type: type,
        reason: reason,
      }
    });
  } catch (error) {
    return _next(error);
  }
};

export const getMovements = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { item_id, outlet_id, date_from, date_to } = req.query;
    const where: any = {};

    if (req.tenantId) {
      where.outlets = { tenant_id: req.tenantId };
    }

    if (item_id) {
      where.item_id = parseInt(item_id as string);
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) where.created_at.lte = new Date(date_to as string);
    }

    // Use real stock_movements table
    const movements = await prisma.stock_movements.findMany({
      where: {
        ...(req.tenantId && { outlets: { tenant_id: req.tenantId } }),
        ...(outlet_id && { outlet_id: parseInt(outlet_id as string) }),
        ...(date_from && { created_at: { gte: new Date(date_from as string) } }),
        ...(date_to && { created_at: { lte: new Date(date_to as string) } }),
        // Note: filtering by item_id needs a join relation or specific field if available.
        // stock_movements has `inventory_id` (for raw materials) or `ingredient_id`
        // We assume this endpoint is for General Items/Products logic, but stock_movements schema is mixed.
        // For now, let's return all movements for the outlet.
      },
      include: {
        outlets: { select: { id: true, name: true } },
        users: { select: { id: true, name: true } },
        inventory: { select: { id: true, name: true } },
        ingredients: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    return _next(error);
  }
};

export const getLowStock = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = {
      is_active: true,
      track_stock: true
    };

    if (req.tenantId) {
      where.outlets = { tenant_id: req.tenantId };
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    // Safe implementation using Prisma
    const allTrackedItems = await prisma.items.findMany({
      where,
      include: {
        outlets: { select: { id: true, name: true } }
      },
      orderBy: { stock: 'asc' }
    });

    // Filter in-memory because Prisma doesn't support comparing two columns in `where` clause yet
    const lowStockItems = allTrackedItems.filter(item => {
      const stock = parseFloat(item.stock?.toString() || '0');
      const minStock = parseFloat(item.min_stock?.toString() || '0');
      return stock <= minStock;
    });

    res.json({ success: true, data: lowStockItems, count: lowStockItems.length });
  } catch (error) {
    return _next(error);
  }
};
