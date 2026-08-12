import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const tenantOutletIds = async (tenantId: number) => {
  const outlets = await prisma.outlets.findMany({ where: { tenant_id: tenantId }, select: { id: true } });
  return outlets.map((outlet) => outlet.id);
};

const requireTenantOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const requestedOutlet = req.query.outlet_id ? Number(req.query.outlet_id) : null;
    if (requestedOutlet && !outletIds.includes(requestedOutlet)) return res.status(403).json({ success: false, error: { code: 'OUTLET_ACCESS_DENIED', message: 'Outlet bukan milik tenant ini' } });

    const suppliers = await prisma.suppliers.findMany({
      where: {
        outlet_id: requestedOutlet || { in: outletIds },
        ...(req.query.active_only === 'true' && { is_active: true })
      },
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: suppliers, count: suppliers.length });
  } catch (error) {
    next(error);
  }
};

export const getSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const supplier = await prisma.suppliers.findFirst({
      where: { id: Number(req.params.id), outlet_id: { in: outletIds } },
      include: { expenses: { orderBy: { created_at: 'desc' }, take: 10 }, _count: { select: { expenses: true } } }
    });
    if (!supplier) return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } });

    const stockMovements = await prisma.stock_movements.findMany({
      where: { supplier_id: supplier.id, outlet_id: supplier.outlet_id },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { ingredients: { select: { name: true } }, inventory: { select: { name: true } } }
    });
    res.json({ success: true, data: { ...supplier, stockMovements } });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const { outletId, name, phone, email, address, notes } = req.body;
    const outletIdValue = Number(outletId);
    if (!outletIdValue || !String(name || '').trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet ID and name are required' } });
    await requireTenantOutlet(tenantId, outletIdValue);

    const normalizedName = String(name).trim();
    const existing = await prisma.suppliers.findFirst({ where: { outlet_id: outletIdValue, name: normalizedName, is_active: true } });
    if (existing) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_SUPPLIER', message: 'Supplier dengan nama tersebut sudah ada' } });

    const supplier = await prisma.suppliers.create({
      data: { outlet_id: outletIdValue, name: normalizedName, phone: phone || null, email: email || null, address: address || null, notes: notes || null, is_active: true }
    });
    try {
      await createActivityLog(req.userId || 0, 'supplier_create', 'supplier', supplier.id, null, supplier, 'Created new supplier', outletIdValue);
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }
    res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const id = Number(req.params.id);
    const { name, phone, email, address, notes, isActive } = req.body;
    const existing = await prisma.suppliers.findFirst({ where: { id, outlet_id: { in: outletIds } } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } });

    if (name && String(name).trim() !== existing.name) {
      const duplicate = await prisma.suppliers.findFirst({ where: { outlet_id: existing.outlet_id, name: String(name).trim(), is_active: true, id: { not: id } } });
      if (duplicate) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_SUPPLIER', message: 'Supplier dengan nama tersebut sudah ada' } });
    }

    const supplier = await prisma.suppliers.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { is_active: Boolean(isActive) })
      }
    });
    try {
      await createActivityLog(req.userId || 0, 'supplier_update', 'supplier', supplier.id, existing, supplier, 'Updated supplier', existing.outlet_id);
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }
    res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const id = Number(req.params.id);
    const existing = await prisma.suppliers.findFirst({ where: { id, outlet_id: { in: outletIds } } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } });

    await prisma.suppliers.update({ where: { id }, data: { is_active: false } });
    try {
      await createActivityLog(req.userId || 0, 'supplier_delete', 'supplier', id, existing, null, 'Deleted supplier', existing.outlet_id);
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getSupplierSpending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const requestedOutlet = req.query.outlet_id ? Number(req.query.outlet_id) : null;
    if (requestedOutlet && !outletIds.includes(requestedOutlet)) return res.status(403).json({ success: false, error: { code: 'OUTLET_ACCESS_DENIED', message: 'Outlet bukan milik tenant ini' } });
    const scopedOutlets = requestedOutlet ? [requestedOutlet] : outletIds;

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (req.query.date_from) createdAt.gte = new Date(String(req.query.date_from));
    if (req.query.date_to) createdAt.lte = new Date(String(req.query.date_to));
    const hasDateFilter = Object.keys(createdAt).length > 0;

    const stockTotals = await prisma.stock_movements.groupBy({
      by: ['supplier_id'],
      where: { outlet_id: { in: scopedOutlets }, supplier_id: { not: null }, ...(hasDateFilter && { created_at: createdAt }) },
      _sum: { total_cost: true }
    });
    const stockTotalMap = new Map<number, number>(
      stockTotals.filter((row) => row.supplier_id !== null).map((row) => [Number(row.supplier_id), Number(row._sum.total_cost || 0)] as [number, number])
    );

    const suppliers = await prisma.suppliers.findMany({
      where: { is_active: true, outlet_id: { in: scopedOutlets } },
      include: { expenses: { where: { outlet_id: { in: scopedOutlets }, ...(hasDateFilter && { created_at: createdAt }) }, select: { amount: true } } }
    });
    const spending = suppliers.map((supplier) => {
      const stockSpending = stockTotalMap.get(supplier.id) || 0;
      const expenseSpending = supplier.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      return { id: supplier.id, name: supplier.name, stockSpending, expenseSpending, totalSpending: stockSpending + expenseSpending };
    }).sort((a, b) => b.totalSpending - a.totalSpending);
    res.json({ success: true, data: spending });
  } catch (error) {
    next(error);
  }
};
