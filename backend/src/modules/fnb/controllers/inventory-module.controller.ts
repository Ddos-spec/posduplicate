import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// Get all inventory items
export const getAllInventory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, category, low_stock } = req.query;
    const where: any = { is_active: true };

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (category) {
      where.category = category;
    }

    const items = await prisma.inventory.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    // Filter low stock if requested
    let filteredItems = items;
    if (low_stock === 'true') {
      filteredItems = items.filter(item =>
        item.alert && parseFloat(item.current_stock.toString()) <= parseFloat(item.stock_alert.toString())
      );
    }

    res.json({
      success: true,
      data: filteredItems,
      count: filteredItems.length
    });
  } catch (error) {
    return _next(error);
  }
};

// Get single inventory item
export const getInventoryById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ditemukan' }
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    return _next(error);
  }
};

// Create new inventory item
export const createInventory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      name,
      category,
      unit,
      currentStock = 0,
      alert = false,
      stockAlert = 0,
      trackCost = false,
      costAmount = 0,
      outletId
    } = req.body;

    // Validation
    if (!name || !category || !unit) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, category, dan unit wajib diisi' }
      });
    }

    const newItem = await prisma.inventory.create({
      data: {
        name,
        category,
        unit,
        current_stock: parseFloat(currentStock),
        alert,
        stock_alert: parseFloat(stockAlert),
        track_cost: trackCost,
        cost_amount: parseFloat(costAmount),
        outlet_id: outletId ? parseInt(outletId) : null,
        is_active: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Item berhasil ditambahkan',
      data: newItem
    });
  } catch (error) {
    return _next(error);
  }
};

// Update inventory item
export const updateInventory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      unit,
      currentStock,
      alert,
      stockAlert,
      trackCost,
      costAmount,
      outletId,
      isActive
    } = req.body;

    // Check if item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ditemukan' }
      });
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(currentStock !== undefined && { current_stock: parseFloat(currentStock) }),
        ...(alert !== undefined && { alert }),
        ...(stockAlert !== undefined && { stock_alert: parseFloat(stockAlert) }),
        ...(trackCost !== undefined && { track_cost: trackCost }),
        ...(costAmount !== undefined && { cost_amount: parseFloat(costAmount) }),
        ...(outletId !== undefined && { outlet_id: outletId ? parseInt(outletId) : null }),
        ...(isActive !== undefined && { is_active: isActive })
      }
    });

    res.json({
      success: true,
      message: 'Item berhasil diupdate',
      data: updatedItem
    });
  } catch (error) {
    return _next(error);
  }
};

// Delete inventory item (soft delete)
export const deleteInventory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingItem = await prisma.inventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ditemukan' }
      });
    }

    await prisma.inventory.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    res.json({
      success: true,
      message: 'Item berhasil dihapus'
    });
  } catch (error) {
    return _next(error);
  }
};

// Get low stock items
export const getLowStockItems = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = {
      is_active: true,
      alert: true
    };

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    const items = await prisma.inventory.findMany({
      where,
      orderBy: { current_stock: 'asc' }
    });

    // Filter items where current stock is at or below alert threshold
    const lowStockItems = items.filter(item =>
      parseFloat(item.current_stock.toString()) <= parseFloat(item.stock_alert.toString())
    );

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    return _next(error);
  }
};

// Get inventory categories
export const getInventoryCategories = async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    const categories = await prisma.inventory.findMany({
      where: { is_active: true },
      select: { category: true },
      distinct: ['category']
    });

    const categoryList = categories.map(c => c.category);

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    return _next(error);
  }
};

// Adjust stock
export const adjustInventoryStock = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { quantity, type, notes } = req.body;

    if (!quantity || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Quantity dan type wajib diisi' }
      });
    }

    const item = await prisma.inventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ditemukan' }
      });
    }

    const currentStock = parseFloat(item.current_stock.toString());
    const adjustment = parseFloat(quantity);
    const newStock = type === 'in' ? currentStock + adjustment : currentStock - adjustment;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STOCK', message: 'Stok tidak boleh negatif' }
      });
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: parseInt(id) },
      data: { current_stock: newStock }
    });

    res.json({
      success: true,
      message: 'Stok berhasil disesuaikan',
      data: {
        item: updatedItem,
        stockBefore: currentStock,
        stockAfter: newStock,
        adjustment,
        type,
        notes
      }
    });
  } catch (error) {
    return _next(error);
  }
};
