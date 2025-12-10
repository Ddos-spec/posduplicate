import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { createActivityLog } from './activity-log.controller';

// Get all suppliers
export const getSuppliers = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, active_only } = req.query;
    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (active_only === 'true') {
      where.isActive = true;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            stockMovements: true,
            expenses: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: suppliers, count: suppliers.length });
  } catch (error) {
    return _next(error);
  }
};

// Get single supplier with details
export const getSupplier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            ingredient: { select: { name: true } },
            inventory: { select: { name: true } }
          }
        },
        expenses: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            stockMovements: true,
            expenses: true
          }
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' }
      });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    return _next(error);
  }
};

// Create new supplier
export const createSupplier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outletId, name, phone, email, address, notes } = req.body;

    // Validation
    if (!outletId || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet ID and name are required' }
      });
    }

    // Check for duplicate name in same outlet
    const existing = await prisma.supplier.findFirst({
      where: {
        outletId: parseInt(outletId),
        name: name,
        isActive: true
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_SUPPLIER', message: 'Supplier dengan nama tersebut sudah ada' }
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        outletId: parseInt(outletId),
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        isActive: true
      }
    });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'supplier_create',
        'supplier',
        supplier.id,
        null,
        supplier,
        'Created new supplier',
        parseInt(outletId)
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    return _next(error);
  }
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, notes, isActive } = req.body;

    const existing = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' }
      });
    }

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      }
    });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'supplier_update',
        'supplier',
        supplier.id,
        existing,
        supplier,
        'Updated supplier',
        existing.outletId
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    return _next(error);
  }
};

// Delete supplier (soft delete)
export const deleteSupplier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' }
      });
    }

    // Soft delete
    await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'supplier_delete',
        'supplier',
        parseInt(id),
        existing,
        null,
        'Deleted supplier',
        existing.outletId
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

// Get supplier spending summary
export const getSupplierSpending = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to } = req.query;
    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) where.createdAt.lte = new Date(date_to as string);
    }

    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true, ...(outlet_id && { outletId: parseInt(outlet_id as string) }) },
      include: {
        stockMovements: {
          where,
          select: {
            totalCost: true
          }
        },
        expenses: {
          where,
          select: {
            amount: true
          }
        }
      }
    });

    // Calculate spending per supplier
    const spending = suppliers.map((supplier: any) => {
      const stockSpending = supplier.stockMovements.reduce(
        (sum: number, m: any) => sum + parseFloat((m.totalCost || 0).toString()),
        0
      );

      const expenseSpending = supplier.expenses.reduce(
        (sum: number, e: any) => sum + parseFloat((e.amount || 0).toString()),
        0
      );

      return {
        id: supplier.id,
        name: supplier.name,
        stockSpending,
        expenseSpending,
        totalSpending: stockSpending + expenseSpending
      };
    }).sort((a: any, b: any) => b.totalSpending - a.totalSpending);

    res.json({
      success: true,
      data: spending
    });
  } catch (error) {
    return _next(error);
  }
};
