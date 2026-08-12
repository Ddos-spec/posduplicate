import { NextFunction, Request, Response } from 'express';
import prisma from '../../../utils/prisma';

const tenantOutletIds = async (tenantId: number) => {
  const outlets = await prisma.outlets.findMany({ where: { tenant_id: tenantId }, select: { id: true } });
  return outlets.map((outlet) => outlet.id);
};

const requireTenant = (req: Request) => {
  if (!req.tenantId) {
    const error: any = new Error('Tenant context is required');
    error.status = 400;
    error.code = 'TENANT_REQUIRED';
    throw error;
  }
  return req.tenantId;
};

const requireOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true, name: true } });
  if (!outlet) {
    const error: any = new Error('Outlet tidak ditemukan atau bukan milik tenant ini');
    error.status = 403;
    error.code = 'OUTLET_ACCESS_DENIED';
    throw error;
  }
  return outlet;
};

const generatePONumber = async (outletId: number) => {
  const now = new Date();
  const prefix = `PO${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${String(outletId).padStart(3, '0')}`;
  const last = await prisma.purchase_orders.findFirst({
    where: { outlet_id: outletId, po_number: { startsWith: prefix } },
    orderBy: { po_number: 'desc' },
    select: { po_number: true }
  });
  const lastSequence = last ? Number(last.po_number.split('-').at(-1)) || 0 : 0;
  return `${prefix}-${String(lastSequence + 1).padStart(4, '0')}`;
};

const includePO = {
  suppliers: { select: { id: true, name: true, phone: true } },
  users_created: { select: { id: true, name: true } },
  users_approved: { select: { id: true, name: true } },
  purchase_order_items: {
    include: { inventory: { select: { id: true, name: true, sku: true, unit: true, current_stock: true } } }
  }
} as const;

export const getAllPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const requestedOutlet = req.query.outlet_id ? Number(req.query.outlet_id) : null;
    if (requestedOutlet && !outletIds.includes(requestedOutlet)) {
      return res.status(403).json({ success: false, error: { code: 'OUTLET_ACCESS_DENIED', message: 'Outlet bukan milik tenant ini' } });
    }

    const where: any = { outlet_id: requestedOutlet || { in: outletIds } };
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.supplier_id) where.supplier_id = Number(req.query.supplier_id);

    const orders = await prisma.purchase_orders.findMany({ where, include: includePO, orderBy: { created_at: 'desc' } });
    res.json({
      success: true,
      data: orders.map((order) => ({ ...order, created_by_user: order.users_created, approved_by_user: order.users_approved })),
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const order = await prisma.purchase_orders.findFirst({
      where: { id: Number(req.params.id), outlet_id: { in: outletIds } },
      include: includePO
    });
    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' } });
    res.json({ success: true, data: { ...order, created_by_user: order.users_created, approved_by_user: order.users_approved } });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const { outletId, supplierId, expectedDate, notes, items } = req.body;
    const outletIdValue = Number(outletId);
    if (!outletIdValue || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet dan items wajib diisi' } });
    }
    await requireOutlet(tenantId, outletIdValue);

    if (supplierId) {
      const supplier = await prisma.suppliers.findFirst({ where: { id: Number(supplierId), outlet_id: outletIdValue, is_active: true } });
      if (!supplier) return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier tidak ditemukan pada outlet ini' } });
    }

    const inventoryIds = items.map((item: any) => Number(item.inventoryId));
    const inventoryRows = await prisma.inventory.findMany({ where: { id: { in: inventoryIds }, outlet_id: outletIdValue, is_active: true } });
    const inventoryMap = new Map(inventoryRows.map((item) => [item.id, item]));
    if (inventoryRows.length !== new Set(inventoryIds).size) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INVENTORY', message: 'Ada inventory yang tidak ditemukan pada outlet ini' } });
    }

    let subtotal = 0;
    const poItems = items.map((item: any) => {
      const inventory = inventoryMap.get(Number(item.inventoryId))!;
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        throw Object.assign(new Error('Quantity/harga PO tidak valid'), { status: 400, code: 'INVALID_PO_ITEM' });
      }
      const lineSubtotal = quantity * unitPrice;
      subtotal += lineSubtotal;
      return {
        inventory_id: inventory.id,
        quantity,
        unit: item.unit || inventory.unit,
        unit_price: unitPrice,
        subtotal: lineSubtotal
      };
    });

    const poNumber = await generatePONumber(outletIdValue);
    const order = await prisma.purchase_orders.create({
      data: {
        outlet_id: outletIdValue,
        po_number: poNumber,
        supplier_id: supplierId ? Number(supplierId) : null,
        status: 'draft',
        expected_date: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        total: subtotal,
        notes: notes || null,
        created_by: req.userId!,
        purchase_order_items: { create: poItems }
      },
      include: includePO
    });
    res.status(201).json({ success: true, message: 'PO berhasil dibuat', data: order });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const id = Number(req.params.id);
    const existing = await prisma.purchase_orders.findFirst({ where: { id, outlet_id: { in: outletIds } } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' } });
    if (!['draft', 'pending'].includes(existing.status)) return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Hanya draft/pending yang bisa diedit' } });

    const { supplierId, expectedDate, notes, items } = req.body;
    if (supplierId !== undefined && supplierId !== null) {
      const supplier = await prisma.suppliers.findFirst({ where: { id: Number(supplierId), outlet_id: existing.outlet_id, is_active: true } });
      if (!supplier) return res.status(404).json({ success: false, error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier tidak ditemukan pada outlet ini' } });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let subtotal = Number(existing.subtotal);
      if (Array.isArray(items) && items.length > 0) {
        const ids = items.map((item: any) => Number(item.inventoryId));
        const inventoryRows = await tx.inventory.findMany({ where: { id: { in: ids }, outlet_id: existing.outlet_id, is_active: true } });
        if (inventoryRows.length !== new Set(ids).size) throw Object.assign(new Error('Inventory PO tidak valid'), { status: 400, code: 'INVALID_INVENTORY' });
        const inventoryMap = new Map(inventoryRows.map((row) => [row.id, row]));
        subtotal = 0;
        const normalized = items.map((item: any) => {
          const inv = inventoryMap.get(Number(item.inventoryId))!;
          const qty = Number(item.quantity);
          const price = Number(item.unitPrice);
          if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) throw Object.assign(new Error('Quantity/harga PO tidak valid'), { status: 400, code: 'INVALID_PO_ITEM' });
          const line = qty * price;
          subtotal += line;
          return { po_id: id, inventory_id: inv.id, quantity: qty, unit: item.unit || inv.unit, unit_price: price, subtotal: line };
        });
        await tx.purchase_order_items.deleteMany({ where: { po_id: id } });
        await tx.purchase_order_items.createMany({ data: normalized });
      }

      return tx.purchase_orders.update({
        where: { id },
        data: {
          ...(supplierId !== undefined && { supplier_id: supplierId ? Number(supplierId) : null }),
          ...(expectedDate !== undefined && { expected_date: expectedDate ? new Date(expectedDate) : null }),
          ...(notes !== undefined && { notes }),
          subtotal,
          total: subtotal
        },
        include: includePO
      });
    });

    res.json({ success: true, message: 'PO berhasil diupdate', data: updated });
  } catch (error) {
    next(error);
  }
};

const transitions: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'cancelled', 'draft'],
  approved: ['ordered', 'cancelled'],
  ordered: ['cancelled'],
  partial: ['cancelled'],
  received: [],
  cancelled: []
};

export const updatePOStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const id = Number(req.params.id);
    const status = String(req.body.status || '');
    const existing = await prisma.purchase_orders.findFirst({ where: { id, outlet_id: { in: outletIds } } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' } });
    if (!(transitions[existing.status] || []).includes(status)) {
      return res.status(409).json({ success: false, error: { code: 'INVALID_TRANSITION', message: `Transisi ${existing.status} → ${status} tidak diizinkan` } });
    }

    const order = await prisma.purchase_orders.update({
      where: { id },
      data: {
        status,
        ...(status === 'approved' && { approved_by: req.userId, approved_at: new Date() })
      }
    });
    res.json({ success: true, message: `Status PO diubah ke ${status}`, data: order });
  } catch (error) {
    next(error);
  }
};

export const receivePOItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const id = Number(req.params.id);
    const receiptItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (receiptItems.length === 0) return res.status(400).json({ success: false, error: { code: 'ITEMS_REQUIRED', message: 'Item penerimaan wajib diisi' } });

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchase_orders.findFirst({
        where: { id, outlet_id: { in: outletIds } },
        include: { purchase_order_items: true }
      });
      if (!po) throw Object.assign(new Error('PO tidak ditemukan'), { status: 404, code: 'NOT_FOUND' });
      if (!['approved', 'ordered', 'partial'].includes(po.status)) throw Object.assign(new Error('PO harus approved/ordered/partial sebelum receiving'), { status: 409, code: 'INVALID_STATUS' });

      for (const receipt of receiptItems) {
        const poItem = po.purchase_order_items.find((item) => item.id === Number(receipt.itemId));
        if (!poItem) throw Object.assign(new Error(`PO item ${receipt.itemId} tidak ditemukan`), { status: 404, code: 'PO_ITEM_NOT_FOUND' });
        const previousReceived = Number(poItem.received_qty || 0);
        const nextReceived = Number(receipt.receivedQty);
        const orderedQty = Number(poItem.quantity);
        if (!Number.isFinite(nextReceived) || nextReceived < previousReceived || nextReceived > orderedQty) {
          throw Object.assign(new Error(`Received qty ${nextReceived} tidak valid untuk ${poItem.id}; sebelumnya ${previousReceived}, order ${orderedQty}`), { status: 400, code: 'INVALID_RECEIVED_QTY' });
        }
        const delta = nextReceived - previousReceived;
        if (delta <= 0) continue;

        const inv = await tx.inventory.findFirst({ where: { id: poItem.inventory_id, outlet_id: po.outlet_id } });
        if (!inv) throw Object.assign(new Error(`Inventory ${poItem.inventory_id} tidak ditemukan pada outlet PO`), { status: 404, code: 'INVENTORY_NOT_FOUND' });
        const stockBefore = Number(inv.current_stock || 0);
        const stockAfter = stockBefore + delta;
        const unitPrice = Number(poItem.unit_price || 0);

        await tx.purchase_order_items.update({ where: { id: poItem.id }, data: { received_qty: nextReceived } });
        await tx.inventory.update({
          where: { id: inv.id },
          data: { current_stock: stockAfter, last_restock_date: new Date(), ...(unitPrice > 0 && { cost_amount: unitPrice }) }
        });
        await tx.stock_movements.create({
          data: {
            outlet_id: po.outlet_id,
            inventory_id: inv.id,
            type: 'IN',
            quantity: delta,
            unit_price: unitPrice,
            total_cost: delta * unitPrice,
            stock_before: stockBefore,
            stock_after: stockAfter,
            supplier_id: po.supplier_id,
            notes: `PO receipt ${po.po_number} · PO item ${poItem.id}`,
            user_id: req.userId!
          }
        });
      }

      const latest = await tx.purchase_order_items.findMany({ where: { po_id: id } });
      const allReceived = latest.every((item) => Number(item.received_qty || 0) >= Number(item.quantity));
      const someReceived = latest.some((item) => Number(item.received_qty || 0) > 0);
      const status = allReceived ? 'received' : someReceived ? 'partial' : po.status;
      await tx.purchase_orders.update({
        where: { id },
        data: { status, ...(status === 'received' && { received_date: new Date() }) }
      });
      return { status, items: latest };
    });

    res.json({ success: true, message: 'Penerimaan barang berhasil dicatat secara atomic', data: result });
  } catch (error) {
    next(error);
  }
};

export const deletePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const id = Number(req.params.id);
    const existing = await prisma.purchase_orders.findFirst({ where: { id, outlet_id: { in: outletIds } } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' } });
    if (existing.status !== 'draft') return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Hanya draft yang boleh dihapus; PO lain harus dibatalkan agar histori tetap utuh' } });
    await prisma.$transaction(async (tx) => {
      await tx.purchase_order_items.deleteMany({ where: { po_id: id } });
      await tx.purchase_orders.delete({ where: { id } });
    });
    res.json({ success: true, message: 'Draft PO berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

export const getPOSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const requestedOutlet = req.query.outlet_id ? Number(req.query.outlet_id) : null;
    if (requestedOutlet && !outletIds.includes(requestedOutlet)) return res.status(403).json({ success: false, error: { code: 'OUTLET_ACCESS_DENIED', message: 'Outlet bukan milik tenant ini' } });
    const items = await prisma.inventory.findMany({
      where: { outlet_id: requestedOutlet || { in: outletIds }, is_active: true },
      include: { suppliers: { select: { id: true, name: true } } }
    });
    const suggestions = items.filter((item) => Number(item.current_stock) <= Number(item.min_stock)).map((item) => {
      const currentStock = Number(item.current_stock);
      const minStock = Number(item.min_stock);
      const avgDaily = Number(item.avg_daily_usage || 0);
      return {
        inventoryId: item.id,
        name: item.name,
        sku: item.sku,
        currentStock,
        minStock,
        suggestedQty: Math.ceil(Math.max(minStock + avgDaily * 5 - currentStock, minStock)),
        unit: item.unit,
        supplier: item.suppliers,
        costPerUnit: Number(item.cost_amount || 0)
      };
    });
    res.json({ success: true, data: suggestions, count: suggestions.length });
  } catch (error) {
    next(error);
  }
};
