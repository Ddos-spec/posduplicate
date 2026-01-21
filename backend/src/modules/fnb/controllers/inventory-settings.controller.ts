import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// Get inventory settings for outlet
export const getInventorySettings = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;

    if (!outlet_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'outlet_id wajib diisi' }
      });
    }

    let settings = await prisma.inventory_settings.findUnique({
      where: { outlet_id: parseInt(outlet_id as string) }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.inventory_settings.create({
        data: {
          outlet_id: parseInt(outlet_id as string),
          business_type: 'fnb',
          low_stock_threshold_days: 3,
          auto_reorder_enabled: false,
          reorder_lead_days: 2,
          track_expiry: false,
          expiry_warning_days: 30,
          track_batch: false,
          settings: {}
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    return _next(error);
  }
};

// Update inventory settings
export const updateInventorySettings = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const {
      businessType,
      lowStockThresholdDays,
      autoReorderEnabled,
      reorderLeadDays,
      trackExpiry,
      expiryWarningDays,
      trackBatch,
      settings: customSettings
    } = req.body;

    if (!outlet_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'outlet_id wajib diisi' }
      });
    }

    // Upsert settings
    const settings = await prisma.inventory_settings.upsert({
      where: { outlet_id: parseInt(outlet_id as string) },
      update: {
        ...(businessType !== undefined && { business_type: businessType }),
        ...(lowStockThresholdDays !== undefined && { low_stock_threshold_days: lowStockThresholdDays }),
        ...(autoReorderEnabled !== undefined && { auto_reorder_enabled: autoReorderEnabled }),
        ...(reorderLeadDays !== undefined && { reorder_lead_days: reorderLeadDays }),
        ...(trackExpiry !== undefined && { track_expiry: trackExpiry }),
        ...(expiryWarningDays !== undefined && { expiry_warning_days: expiryWarningDays }),
        ...(trackBatch !== undefined && { track_batch: trackBatch }),
        ...(customSettings !== undefined && { settings: customSettings })
      },
      create: {
        outlet_id: parseInt(outlet_id as string),
        business_type: businessType || 'fnb',
        low_stock_threshold_days: lowStockThresholdDays || 3,
        auto_reorder_enabled: autoReorderEnabled || false,
        reorder_lead_days: reorderLeadDays || 2,
        track_expiry: trackExpiry || false,
        expiry_warning_days: expiryWarningDays || 30,
        track_batch: trackBatch || false,
        settings: customSettings || {}
      }
    });

    res.json({
      success: true,
      message: 'Settings berhasil diupdate',
      data: settings
    });
  } catch (error) {
    return _next(error);
  }
};

// Get business type specific fields info
export const getBusinessTypeFields = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { business_type } = req.query;

    const businessTypeFields: Record<string, any> = {
      fnb: {
        name: 'Food & Beverage',
        requiredFields: ['name', 'category', 'unit', 'currentStock', 'minStock'],
        optionalFields: ['sku', 'supplier', 'daysCover', 'source'],
        features: {
          trackDaysCover: true,
          trackSource: true,
          trackExpiry: false,
          trackBatch: false,
          trackVariant: false
        },
        categories: ['Bahan Pokok', 'Minuman', 'Frozen Food', 'Packaging', 'WIP (Olahan)', 'Bumbu', 'Lainnya'],
        sources: ['DC', 'Supplier Langsung']
      },
      pharmacy: {
        name: 'Pharmacy',
        requiredFields: ['name', 'category', 'unit', 'currentStock', 'minStock', 'batchNo', 'expiryDate'],
        optionalFields: ['sku', 'supplier', 'barcode'],
        features: {
          trackDaysCover: false,
          trackSource: false,
          trackExpiry: true,
          trackBatch: true,
          trackVariant: false
        },
        categories: ['Obat Keras', 'Obat Bebas', 'Obat Bebas Terbatas', 'Alat Kesehatan', 'Suplemen', 'Kosmetik'],
        expiryWarningDays: [30, 60, 90]
      },
      retail: {
        name: 'Retail',
        requiredFields: ['name', 'category', 'unit', 'currentStock', 'minStock'],
        optionalFields: ['sku', 'supplier', 'barcode', 'variant'],
        features: {
          trackDaysCover: false,
          trackSource: false,
          trackExpiry: false,
          trackBatch: false,
          trackVariant: true
        },
        categories: ['Elektronik', 'Fashion', 'Makanan & Minuman', 'Peralatan Rumah', 'Kosmetik', 'Lainnya']
      }
    };

    if (business_type && businessTypeFields[business_type as string]) {
      return res.json({
        success: true,
        data: businessTypeFields[business_type as string]
      });
    }

    res.json({
      success: true,
      data: businessTypeFields
    });
  } catch (error) {
    return _next(error);
  }
};

// Get inventory summary by category
export const getInventorySummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { is_active: true };

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    const items = await prisma.inventory.findMany({ where });

    // Group by category
    const categoryMap: Record<string, { count: number; totalValue: number; lowStock: number }> = {};

    items.forEach(item => {
      const category = item.category || 'Uncategorized';
      const currentStock = parseFloat(item.current_stock.toString());
      const minStock = parseFloat(item.min_stock.toString());
      const costAmount = parseFloat(item.cost_amount.toString());

      if (!categoryMap[category]) {
        categoryMap[category] = { count: 0, totalValue: 0, lowStock: 0 };
      }

      categoryMap[category].count++;
      categoryMap[category].totalValue += currentStock * costAmount;
      if (currentStock <= minStock) {
        categoryMap[category].lowStock++;
      }
    });

    const summary = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      ...data
    }));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    return _next(error);
  }
};
