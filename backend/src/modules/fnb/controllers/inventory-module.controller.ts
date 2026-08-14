import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

type OutletFilter = number | { in: number[] };

const scopedOutletFilter = (req: Request, rawOutletId?: unknown): OutletFilter | null => {
  const outletIds = req.tenantOutletIds ?? [];
  if (rawOutletId === undefined || rawOutletId === null || rawOutletId === '') {
    return { in: outletIds };
  }
  const outletId = Number(rawOutletId);
  if (!Number.isInteger(outletId) || !outletIds.includes(outletId)) return null;
  return outletId;
};

async function hasValidOutlet(outletId: number | null | undefined) {
  if (!outletId) return false;
  const outlet = await prisma.outlets.findUnique({ where: { id: outletId }, select: { id: true } });
  return Boolean(outlet);
}

// Helper: Check and create real-time alerts after stock change
async function checkAndCreateAlerts(inventoryId: number, outletId: number) {
  const item = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!item) return;
  if (!(await hasValidOutlet(outletId))) return;

  const currentStock = parseFloat(item.current_stock.toString());
  const minStock = parseFloat(item.min_stock.toString());

  if (currentStock <= 0) {
    const existing = await prisma.inventory_alerts.findFirst({
      where: { inventory_id: inventoryId, alert_type: 'out_of_stock', is_resolved: false }
    });
    if (!existing) {
      await prisma.inventory_alerts.create({
        data: {
          outlet_id: outletId,
          inventory_id: inventoryId,
          alert_type: 'out_of_stock',
          severity: 'critical',
          message: `${item.name} HABIS! Segera lakukan restock.`
        }
      });
    }
  } else if (currentStock <= minStock) {
    const existing = await prisma.inventory_alerts.findFirst({
      where: { inventory_id: inventoryId, alert_type: 'low_stock', is_resolved: false }
    });
    if (!existing) {
      await prisma.inventory_alerts.create({
        data: {
          outlet_id: outletId,
          inventory_id: inventoryId,
          alert_type: 'low_stock',
          severity: 'warning',
          message: `${item.name} menipis (sisa ${currentStock} ${item.unit}). Min: ${minStock}`
        }
      });
    }
  } else if (currentStock > minStock) {
    // Auto-resolve alerts if stock is back to normal
    await prisma.inventory_alerts.updateMany({
      where: {
        inventory_id: inventoryId,
        alert_type: { in: ['out_of_stock', 'low_stock'] },
        is_resolved: false
      },
      data: { is_resolved: true, resolved_at: new Date() }
    });
  }
}

// Get all inventory items
export const getAllInventory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, category, low_stock, business_type, status } = req.query;
    const outletFilter = scopedOutletFilter(req, outlet_id);
    if (!outletFilter) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
      });
    }
    const where: any = { is_active: true, outlet_id: outletFilter };

    if (category) {
      where.category = category;
    }

    if (business_type) {
      where.business_type = business_type;
    }

    const items = await prisma.inventory.findMany({
      where,
      include: {
        suppliers: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Filter by status or low_stock
    let filteredItems = items.map(item => {
      const currentStock = parseFloat(item.current_stock.toString());
      const minStock = parseFloat(item.min_stock.toString());
      let itemStatus = 'Aman';
      if (currentStock <= 0) itemStatus = 'Habis';
      else if (currentStock <= minStock) itemStatus = 'Menipis';
      return { ...item, status: itemStatus };
    });

    if (low_stock === 'true' || status === 'Menipis') {
      filteredItems = filteredItems.filter(item => item.status === 'Menipis' || item.status === 'Habis');
    } else if (status === 'Habis') {
      filteredItems = filteredItems.filter(item => item.status === 'Habis');
    } else if (status === 'Aman') {
      filteredItems = filteredItems.filter(item => item.status === 'Aman');
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

// Get inventory stats for dashboard
export const getInventoryStats = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const outletFilter = scopedOutletFilter(req, outlet_id);
    if (!outletFilter) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
      });
    }
    const where: any = { is_active: true, outlet_id: outletFilter };

    const items = await prisma.inventory.findMany({ where });

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalDaysCover = 0;
    let daysCoverCount = 0;

    items.forEach(item => {
      const currentStock = parseFloat(item.current_stock.toString());
      const minStock = parseFloat(item.min_stock.toString());
      const costAmount = parseFloat(item.cost_amount.toString());
      const daysCover = item.days_cover ? parseFloat(item.days_cover.toString()) : 0;

      totalValue += currentStock * costAmount;

      if (currentStock <= 0) outOfStockCount++;
      else if (currentStock <= minStock) lowStockCount++;

      if (daysCover > 0) {
        totalDaysCover += daysCover;
        daysCoverCount++;
      }
    });

    // Count pending POs
    const pendingPOs = await prisma.purchase_orders.count({
      where: {
        outlet_id: outletFilter,
        status: { in: ['draft', 'pending', 'approved', 'ordered'] }
      }
    });

    res.json({
      success: true,
      data: {
        totalValue,
        totalItems: items.length,
        lowStockCount,
        outOfStockCount,
        pendingPO: pendingPOs,
        avgDaysCover: daysCoverCount > 0 ? (totalDaysCover / daysCoverCount).toFixed(1) : 0
      }
    });
  } catch (error) {
    return _next(error);
  }
};

// Get inventory alerts
export const getInventoryAlerts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, include_resolved } = req.query;
    const outletFilter = scopedOutletFilter(req, outlet_id);
    if (!outletFilter) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
      });
    }
    const where: any = { outlet_id: outletFilter };

    if (include_resolved !== 'true') {
      where.is_resolved = false;
    }

    const alerts = await prisma.inventory_alerts.findMany({
      where,
      include: {
        inventory: { select: { id: true, name: true, sku: true, current_stock: true, unit: true } }
      },
      orderBy: [
        { severity: 'desc' },
        { created_at: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    return _next(error);
  }
};

// Generate alerts based on current stock levels
export const generateAlerts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const outletFilter = scopedOutletFilter(req, outlet_id);
    if (!outletFilter) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
      });
    }
    const where: any = { is_active: true, outlet_id: outletFilter };

    const items = await prisma.inventory.findMany({ where });
    const alertsToCreate: any[] = [];

    for (const item of items) {
      if (!(await hasValidOutlet(item.outlet_id))) {
        continue;
      }

      const currentStock = parseFloat(item.current_stock.toString());
      const minStock = parseFloat(item.min_stock.toString());
      const daysCover = item.days_cover ? parseFloat(item.days_cover.toString()) : null;

      // Check for out of stock
      if (currentStock <= 0) {
        alertsToCreate.push({
          outlet_id: item.outlet_id!,
          inventory_id: item.id,
          alert_type: 'out_of_stock',
          severity: 'critical',
          message: `${item.name} HABIS! Segera lakukan restock.`
        });
      }
      // Check for low stock
      else if (currentStock <= minStock) {
        alertsToCreate.push({
          outlet_id: item.outlet_id!,
          inventory_id: item.id,
          alert_type: 'low_stock',
          severity: 'warning',
          message: `${item.name} menipis (sisa ${currentStock} ${item.unit}). Min: ${minStock}`
        });
      }

      // Check for low days cover (FnB specific)
      if (daysCover !== null && daysCover < 3 && currentStock > 0) {
        alertsToCreate.push({
          outlet_id: item.outlet_id!,
          inventory_id: item.id,
          alert_type: 'low_days_cover',
          severity: 'warning',
          message: `${item.name} hanya cukup ${daysCover} hari. Segera order.`
        });
      }

      // Check for expiring items (Pharmacy specific)
      if (item.expiry_date) {
        const daysUntilExpiry = Math.ceil((item.expiry_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 0) {
          alertsToCreate.push({
            outlet_id: item.outlet_id!,
            inventory_id: item.id,
            alert_type: 'expired',
            severity: 'critical',
            message: `${item.name} sudah EXPIRED! Batch: ${item.batch_no}`
          });
        } else if (daysUntilExpiry <= 30) {
          alertsToCreate.push({
            outlet_id: item.outlet_id!,
            inventory_id: item.id,
            alert_type: 'expiring_soon',
            severity: 'warning',
            message: `${item.name} akan expired dalam ${daysUntilExpiry} hari. Batch: ${item.batch_no}`
          });
        }
      }
    }

    // Create alerts (skip duplicates)
    let createdCount = 0;
    for (const alertData of alertsToCreate) {
      const existing = await prisma.inventory_alerts.findFirst({
        where: {
          inventory_id: alertData.inventory_id,
          alert_type: alertData.alert_type,
          is_resolved: false
        }
      });

      if (!existing) {
        await prisma.inventory_alerts.create({ data: alertData });
        createdCount++;
      }
    }

    res.json({
      success: true,
      message: `${createdCount} alert baru dibuat`,
      data: { created: createdCount, total: alertsToCreate.length }
    });
  } catch (error) {
    return _next(error);
  }
};

// Resolve alert
export const resolveAlert = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const existingAlert = await prisma.inventory_alerts.findFirst({
      where: {
        id: parseInt(id),
        outlet_id: { in: req.tenantOutletIds ?? [] }
      }
    });
    if (!existingAlert) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alert tidak ditemukan' }
      });
    }

    const alert = await prisma.inventory_alerts.update({
      where: { id: parseInt(id) },
      data: {
        is_resolved: true,
        resolved_at: new Date(),
        resolved_by: userId
      }
    });

    res.json({
      success: true,
      message: 'Alert resolved',
      data: alert
    });
  } catch (error) {
    return _next(error);
  }
};

// Get inventory forecast
export const getInventoryForecast = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, days = 7 } = req.query;
    const outletFilter = scopedOutletFilter(req, outlet_id);
    if (!outletFilter) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
      });
    }
    const where: any = { outlet_id: outletFilter };

    // Get forecast data from database
    const forecasts = await prisma.inventory_forecast.findMany({
      where: {
        ...where,
        forecast_date: {
          gte: new Date(),
          lte: new Date(Date.now() + parseInt(days as string) * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        inventory: { select: { id: true, name: true } }
      },
      orderBy: { forecast_date: 'asc' }
    });

    // Never fabricate operational forecast data in the live API.
    if (forecasts.length === 0) {
      return res.json({
        success: true,
        data: [],
        source: 'insufficient_data',
        message: 'Belum ada data forecast untuk outlet dan rentang waktu ini'
      });
    }

    const data = forecasts.map((forecast) => {
      const factors = forecast.factors && typeof forecast.factors === 'object' && !Array.isArray(forecast.factors)
        ? forecast.factors as Record<string, unknown>
        : {};
      return {
        day: forecast.forecast_date.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' }),
        date: forecast.forecast_date.toISOString().slice(0, 10),
        usage: forecast.actual_usage === null ? null : Number(forecast.actual_usage),
        predicted: Number(forecast.predicted_usage),
        confidence: forecast.confidence_level === null ? null : Number(forecast.confidence_level),
        reason: typeof factors.reason === 'string' ? factors.reason : '',
        itemId: forecast.inventory_id,
        itemName: forecast.inventory?.name ?? null,
        provenance: 'database',
      };
    });

    res.json({
      success: true,
      data,
      source: 'database'
    });
  } catch (error) {
    return _next(error);
  }
};

// Get single inventory item
export const getInventoryById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventory.findFirst({
      where: {
        id: parseInt(id),
        outlet_id: { in: req.tenantOutletIds ?? [] }
      }
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
      sku,
      category,
      unit,
      currentStock = 0,
      minStock = 0,
      alert = false,
      stockAlert = 0,
      trackCost = false,
      costAmount = 0,
      outletId,
      supplierId,
      businessType = 'fnb',
      daysCover,
      source,
      batchNo,
      expiryDate,
      variant,
      barcode
    } = req.body;

    // Validation
    if (!name || !category || !unit) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, category, dan unit wajib diisi' }
      });
    }
    const parsedOutletId = scopedOutletFilter(req, outletId);
    if (typeof parsedOutletId !== 'number') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'A valid tenant outlet is required' }
      });
    }
    if (supplierId) {
      const supplier = await prisma.suppliers.findFirst({
        where: {
          id: Number(supplierId),
          outlet_id: parsedOutletId,
          is_active: true
        }
      });
      if (!supplier) {
        return res.status(403).json({
          success: false,
          error: { code: 'INVALID_SUPPLIER_SCOPE', message: 'Supplier does not belong to this outlet' }
        });
      }
    }

    const newItem = await prisma.inventory.create({
      data: {
        name,
        sku,
        category,
        unit,
        current_stock: parseFloat(currentStock),
        min_stock: parseFloat(minStock),
        alert,
        stock_alert: parseFloat(stockAlert),
        track_cost: trackCost,
        cost_amount: parseFloat(costAmount),
        outlet_id: parsedOutletId,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        business_type: businessType,
        days_cover: daysCover ? parseFloat(daysCover) : null,
        source,
        batch_no: batchNo,
        expiry_date: expiryDate ? new Date(expiryDate) : null,
        variant,
        barcode,
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
      sku,
      category,
      unit,
      currentStock,
      minStock,
      alert,
      stockAlert,
      trackCost,
      costAmount,
      outletId,
      supplierId,
      businessType,
      daysCover,
      source,
      batchNo,
      expiryDate,
      variant,
      barcode,
      isActive
    } = req.body;

    // Check if item exists
    const existingItem = await prisma.inventory.findFirst({
      where: {
        id: parseInt(id),
        outlet_id: { in: req.tenantOutletIds ?? [] }
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ditemukan' }
      });
    }
    let nextOutletId = existingItem.outlet_id;
    if (outletId !== undefined) {
      const scopedOutletId = scopedOutletFilter(req, outletId);
      if (typeof scopedOutletId !== 'number') {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
        });
      }
      nextOutletId = scopedOutletId;
    }
    if (supplierId) {
      const supplier = await prisma.suppliers.findFirst({
        where: {
          id: Number(supplierId),
          outlet_id: nextOutletId!,
          is_active: true
        }
      });
      if (!supplier) {
        return res.status(403).json({
          success: false,
          error: { code: 'INVALID_SUPPLIER_SCOPE', message: 'Supplier does not belong to this outlet' }
        });
      }
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(currentStock !== undefined && { current_stock: parseFloat(currentStock) }),
        ...(minStock !== undefined && { min_stock: parseFloat(minStock) }),
        ...(alert !== undefined && { alert }),
        ...(stockAlert !== undefined && { stock_alert: parseFloat(stockAlert) }),
        ...(trackCost !== undefined && { track_cost: trackCost }),
        ...(costAmount !== undefined && { cost_amount: parseFloat(costAmount) }),
        ...(outletId !== undefined && { outlet_id: nextOutletId }),
        ...(supplierId !== undefined && { supplier_id: supplierId ? parseInt(supplierId) : null }),
        ...(businessType !== undefined && { business_type: businessType }),
        ...(daysCover !== undefined && { days_cover: daysCover ? parseFloat(daysCover) : null }),
        ...(source !== undefined && { source }),
        ...(batchNo !== undefined && { batch_no: batchNo }),
        ...(expiryDate !== undefined && { expiry_date: expiryDate ? new Date(expiryDate) : null }),
        ...(variant !== undefined && { variant }),
        ...(barcode !== undefined && { barcode }),
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

    const existingItem = await prisma.inventory.findFirst({
      where: {
        id: parseInt(id),
        outlet_id: { in: req.tenantOutletIds ?? [] }
      }
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
    const outletFilter = scopedOutletFilter(req, outlet_id);
    if (!outletFilter) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Outlet does not belong to the active tenant' }
      });
    }
    const where: any = {
      is_active: true,
      alert: true,
      outlet_id: outletFilter
    };

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
export const getInventoryCategories = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const categories = await prisma.inventory.findMany({
      where: {
        is_active: true,
        outlet_id: { in: req.tenantOutletIds ?? [] }
      },
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

    const item = await prisma.inventory.findFirst({
      where: {
        id: parseInt(id),
        outlet_id: { in: req.tenantOutletIds ?? [] }
      }
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

    // Create stock_movements record for audit trail
    try {
      await prisma.stock_movements.create({
        data: {
          outlet_id: item.outlet_id || req.outletId || 0,
          inventory_id: parseInt(id),
          type: type === 'in' ? 'adjustment_in' : 'adjustment_out',
          quantity: adjustment,
          unit_price: Number(item.cost_amount || 0),
          total_cost: adjustment * Number(item.cost_amount || 0),
          stock_before: currentStock,
          stock_after: newStock,
          user_id: req.userId || 0,
          notes: notes || 'Stock adjustment'
        }
      });
    } catch (movementError) {
      console.error('Failed to create stock movement:', movementError);
      // Continue even if stock movement logging fails
    }

    // Real-time alert check after stock adjustment
    try {
      await checkAndCreateAlerts(parseInt(id), item.outlet_id || req.outletId || 0);
    } catch (alertError) {
      console.error('Failed to check/create alerts:', alertError);
    }

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
