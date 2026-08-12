import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

export const receivePOItemsWithWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const poId = Number(req.params.id);
    const receiptItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (receiptItems.length === 0) return res.status(400).json({ success: false, error: { code: 'ITEMS_REQUIRED', message: 'Item penerimaan wajib diisi' } });
    const receiptItemIds = receiptItems.map((item: any) => Number(item.itemId));
    if (receiptItemIds.some((itemId: number) => !Number.isInteger(itemId) || itemId <= 0)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RECEIPT_ITEM_ID', message: 'Semua itemId penerimaan harus berupa ID valid' } });
    }
    if (new Set(receiptItemIds).size !== receiptItemIds.length) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_RECEIPT_ITEM', message: 'Satu PO item hanya boleh muncul sekali dalam satu request receiving' } });
    }

    const tenantOutlets = await prisma.outlets.findMany({ where: { tenant_id: tenantId }, select: { id: true } });
    const outletIds = tenantOutlets.map((row) => row.id);
    if (outletIds.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'TENANT_OUTLET_NOT_FOUND', message: 'Tenant belum memiliki outlet untuk receiving' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Serialize aggregate-stock mutations per tenant so concurrent PO receipts cannot overwrite each other.
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 73001)`);
      const locked = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id, outlet_id FROM public.purchase_orders WHERE id = ${poId} AND outlet_id IN (${Prisma.join(outletIds)}) FOR UPDATE
      `);
      if (!locked[0]) throw Object.assign(new Error('PO tidak ditemukan'), { status: 404, code: 'PO_NOT_FOUND' });

      const po = await tx.purchase_orders.findUnique({
        where: { id: poId },
        include: { purchase_order_items: true }
      });
      if (!po) throw Object.assign(new Error('PO tidak ditemukan'), { status: 404, code: 'PO_NOT_FOUND' });
      if (!['approved', 'ordered', 'partial'].includes(po.status)) throw Object.assign(new Error('PO harus approved/ordered/partial sebelum receiving'), { status: 409, code: 'INVALID_STATUS' });

      for (const [code, name, type] of [
        ['MAIN', 'Main Stock', 'stock'],
        ['RECEIVE', 'Receiving', 'receiving']
      ] as const) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.warehouse_locations (tenant_id, outlet_id, code, name, location_type)
          VALUES (${tenantId}, ${po.outlet_id}, ${code}, ${name}, ${type})
          ON CONFLICT (tenant_id, outlet_id, code) DO NOTHING
        `);
      }
      const locations = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id, code FROM public.warehouse_locations WHERE tenant_id = ${tenantId} AND outlet_id = ${po.outlet_id} AND code IN ('MAIN','RECEIVE')
      `);
      const mainLocationId = Number(locations.find((row) => row.code === 'MAIN')?.id);
      const receiveLocationId = Number(locations.find((row) => row.code === 'RECEIVE')?.id);
      if (!mainLocationId || !receiveLocationId) throw Object.assign(new Error('Warehouse default location gagal dibuat'), { status: 500, code: 'WAREHOUSE_LOCATION_INIT_FAILED' });

      for (const receipt of receiptItems) {
        const poItem = po.purchase_order_items.find((item) => item.id === Number(receipt.itemId));
        if (!poItem) throw Object.assign(new Error(`PO item ${receipt.itemId} tidak ditemukan`), { status: 404, code: 'PO_ITEM_NOT_FOUND' });
        const previousReceived = Number(poItem.received_qty || 0);
        const nextReceived = Number(receipt.receivedQty);
        const orderedQty = Number(poItem.quantity);
        if (!Number.isFinite(nextReceived) || nextReceived < previousReceived || nextReceived > orderedQty) {
          throw Object.assign(new Error(`Received qty ${nextReceived} tidak valid; sebelumnya ${previousReceived}, order ${orderedQty}`), { status: 400, code: 'INVALID_RECEIVED_QTY' });
        }
        const delta = nextReceived - previousReceived;
        if (delta <= 0) continue;

        const inv = await tx.inventory.findFirst({ where: { id: poItem.inventory_id, outlet_id: po.outlet_id } });
        if (!inv) throw Object.assign(new Error(`Inventory ${poItem.inventory_id} tidak ditemukan pada outlet PO`), { status: 404, code: 'INVENTORY_NOT_FOUND' });
        const stockBefore = Number(inv.current_stock || 0);
        const stockAfter = stockBefore + delta;
        const unitPrice = Number(poItem.unit_price || 0);

        const existingAllocation = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT COUNT(*)::int AS rows FROM public.warehouse_stock_balances
          WHERE tenant_id = ${tenantId} AND outlet_id = ${po.outlet_id} AND inventory_id = ${inv.id}
        `);
        if (Number(existingAllocation[0]?.rows || 0) === 0) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_stock_balances (tenant_id, outlet_id, location_id, inventory_id, quantity)
            VALUES (${tenantId}, ${po.outlet_id}, ${mainLocationId}, ${inv.id}, ${stockBefore})
          `);
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_stock_ledger (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes, created_by)
            VALUES (${tenantId}, ${po.outlet_id}, ${mainLocationId}, ${inv.id}, 'bootstrap', ${stockBefore}, 0, ${stockBefore}, 'bootstrap', ${String(inv.id)}, 'Seeded immediately before first warehouse-aware PO receipt', ${req.userId || null})
          `);
        }

        const receiveRows = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.warehouse_stock_balances
          WHERE tenant_id = ${tenantId} AND location_id = ${receiveLocationId} AND inventory_id = ${inv.id}
          FOR UPDATE
        `);
        const locationBefore = Number(receiveRows[0]?.quantity || 0);
        const locationAfter = locationBefore + delta;
        if (receiveRows[0]) {
          await tx.$executeRaw(Prisma.sql`UPDATE public.warehouse_stock_balances SET quantity = ${locationAfter}, updated_at = NOW() WHERE id = ${receiveRows[0].id}`);
        } else {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_stock_balances (tenant_id, outlet_id, location_id, inventory_id, quantity)
            VALUES (${tenantId}, ${po.outlet_id}, ${receiveLocationId}, ${inv.id}, ${locationAfter})
          `);
        }
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.warehouse_stock_ledger (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes, created_by)
          VALUES (${tenantId}, ${po.outlet_id}, ${receiveLocationId}, ${inv.id}, 'receipt', ${delta}, ${locationBefore}, ${locationAfter}, 'purchase_order', ${String(po.id)}, ${po.po_number}, ${req.userId || null})
        `);

        await tx.purchase_order_items.update({ where: { id: poItem.id }, data: { received_qty: nextReceived } });
        await tx.inventory.update({ where: { id: inv.id }, data: { current_stock: stockAfter, last_restock_date: new Date(), ...(unitPrice > 0 && { cost_amount: unitPrice }) } });
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
            notes: `PO receipt ${po.po_number}; warehouse RECEIVE`,
            user_id: req.userId!
          }
        });
      }

      const latest = await tx.purchase_order_items.findMany({ where: { po_id: poId } });
      const allReceived = latest.every((item) => Number(item.received_qty || 0) >= Number(item.quantity));
      const someReceived = latest.some((item) => Number(item.received_qty || 0) > 0);
      const status = allReceived ? 'received' : someReceived ? 'partial' : po.status;
      await tx.purchase_orders.update({ where: { id: poId }, data: { status, ...(status === 'received' && { received_date: new Date() }) } });
      return { status, items: latest };
    });

    res.json({ success: true, message: 'PO received atomically into aggregate stock + warehouse RECEIVE ledger', data: result });
  } catch (error) {
    next(error);
  }
};
