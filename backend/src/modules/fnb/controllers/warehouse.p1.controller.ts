import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const tenantIdFrom = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const outletIdsFor = async (tenantId: number) => {
  const rows = await prisma.outlets.findMany({ where: { tenant_id: tenantId }, select: { id: true } });
  return rows.map((row) => row.id);
};

const assertOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true, name: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
  return outlet;
};

const assertLocation = async (tenantId: number, locationId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.warehouse_locations WHERE id = ${locationId} AND tenant_id = ${tenantId} AND is_active = TRUE LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Warehouse location tidak ditemukan'), { status: 404, code: 'LOCATION_NOT_FOUND' });
  return rows[0];
};

export const getSupplyChainSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [locations, transfers, counts, barcodes, manufacturing, quality, maintenance] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT COUNT(*)::int AS count FROM public.warehouse_locations WHERE tenant_id = ${tenantId} AND is_active = TRUE`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT status, COUNT(*)::int AS count FROM public.stock_transfers WHERE tenant_id = ${tenantId} GROUP BY status`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT status, COUNT(*)::int AS count FROM public.stock_counts WHERE tenant_id = ${tenantId} GROUP BY status`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT COUNT(*)::int AS count FROM public.barcode_aliases WHERE tenant_id = ${tenantId} AND is_active = TRUE`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT status, COUNT(*)::int AS count FROM public.manufacturing_orders WHERE tenant_id = ${tenantId} GROUP BY status`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT status, COUNT(*)::int AS count FROM public.quality_checks WHERE tenant_id = ${tenantId} GROUP BY status`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT status, COUNT(*)::int AS count FROM public.maintenance_requests WHERE tenant_id = ${tenantId} GROUP BY status`)
    ]);
    res.json({ success: true, data: { locations: locations[0]?.count || 0, transfers, counts, barcodes: barcodes[0]?.count || 0, manufacturing, quality, maintenance } });
  } catch (error) {
    next(error);
  }
};

export const bootstrapWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const outletIds = await outletIdsFor(tenantId);
    let seededBalances = 0;

    for (const outletId of outletIds) {
      await prisma.$transaction(async (tx) => {
        const locations = [
          ['MAIN', 'Main Stock', 'stock'],
          ['RECEIVE', 'Receiving', 'receiving'],
          ['QC', 'Quality Hold', 'quality'],
          ['PROD', 'Production', 'production'],
          ['DISPATCH', 'Dispatch', 'dispatch']
        ] as const;
        for (const [code, name, type] of locations) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_locations (tenant_id, outlet_id, code, name, location_type)
            VALUES (${tenantId}, ${outletId}, ${code}, ${name}, ${type})
            ON CONFLICT (tenant_id, outlet_id, code) DO NOTHING
          `);
        }
        const mainRows = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT id FROM public.warehouse_locations WHERE tenant_id = ${tenantId} AND outlet_id = ${outletId} AND code = 'MAIN' LIMIT 1
        `);
        const mainLocationId = Number(mainRows[0].id);
        const inventory = await tx.inventory.findMany({ where: { outlet_id: outletId, is_active: true }, select: { id: true, current_stock: true } });

        for (const item of inventory) {
          const existing = await tx.$queryRaw<any[]>(Prisma.sql`
            SELECT COALESCE(SUM(quantity), 0) AS qty, COUNT(*)::int AS rows
            FROM public.warehouse_stock_balances
            WHERE tenant_id = ${tenantId} AND outlet_id = ${outletId} AND inventory_id = ${item.id}
          `);
          if (Number(existing[0]?.rows || 0) > 0) continue;
          const quantity = Number(item.current_stock || 0);
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_stock_balances (tenant_id, outlet_id, location_id, inventory_id, quantity)
            VALUES (${tenantId}, ${outletId}, ${mainLocationId}, ${item.id}, ${quantity})
          `);
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_stock_ledger
              (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes, created_by)
            VALUES
              (${tenantId}, ${outletId}, ${mainLocationId}, ${item.id}, 'bootstrap', ${quantity}, 0, ${quantity}, 'bootstrap', ${String(item.id)}, 'Initial allocation from inventory.current_stock', ${req.userId || null})
          `);
          seededBalances += 1;
        }
      });
    }

    res.json({ success: true, data: { outlets: outletIds.length, seededBalances }, message: 'Warehouse locations and initial balances are ready' });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const outletId = req.query.outletId ? Number(req.query.outletId) : null;
    if (outletId) await assertOutlet(tenantId, outletId);
    const rows = outletId
      ? await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.warehouse_locations WHERE tenant_id = ${tenantId} AND outlet_id = ${outletId} AND is_active = TRUE ORDER BY code`)
      : await prisma.$queryRaw<any[]>(Prisma.sql`SELECT l.*, o.name AS outlet_name FROM public.warehouse_locations l LEFT JOIN public.outlets o ON o.id = l.outlet_id WHERE l.tenant_id = ${tenantId} AND l.is_active = TRUE ORDER BY l.outlet_id, l.code`);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createWarehouseLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const outletId = Number(req.body.outletId);
    const code = String(req.body.code || '').trim().toUpperCase();
    const name = String(req.body.name || '').trim();
    const locationType = String(req.body.locationType || 'stock');
    if (!outletId || !code || !name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet, code dan name wajib diisi' } });
    await assertOutlet(tenantId, outletId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.warehouse_locations (tenant_id, outlet_id, code, name, location_type)
      VALUES (${tenantId}, ${outletId}, ${code}, ${name}, ${locationType})
      RETURNING *
    `);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseBalances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const outletId = req.query.outletId ? Number(req.query.outletId) : null;
    if (outletId) await assertOutlet(tenantId, outletId);
    const rows = outletId
      ? await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT b.*, l.code AS location_code, l.name AS location_name, i.name AS inventory_name, i.sku, i.unit, i.current_stock AS aggregate_stock
          FROM public.warehouse_stock_balances b
          JOIN public.warehouse_locations l ON l.id = b.location_id
          LEFT JOIN public.inventory i ON i.id = b.inventory_id
          WHERE b.tenant_id = ${tenantId} AND b.outlet_id = ${outletId}
          ORDER BY i.name, l.code
        `)
      : await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT b.*, l.code AS location_code, l.name AS location_name, i.name AS inventory_name, i.sku, i.unit, i.current_stock AS aggregate_stock, o.name AS outlet_name
          FROM public.warehouse_stock_balances b
          JOIN public.warehouse_locations l ON l.id = b.location_id
          LEFT JOIN public.inventory i ON i.id = b.inventory_id
          LEFT JOIN public.outlets o ON o.id = b.outlet_id
          WHERE b.tenant_id = ${tenantId}
          ORDER BY b.outlet_id, i.name, l.code
        `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getStockTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*, s.code AS source_code, s.name AS source_name, d.code AS destination_code, d.name AS destination_name,
        COALESCE((SELECT json_agg(json_build_object('id', x.id, 'inventoryId', x.inventory_id, 'inventoryName', i.name, 'sku', i.sku, 'quantityRequested', x.quantity_requested, 'quantityDone', x.quantity_done) ORDER BY x.id)
          FROM public.stock_transfer_lines x LEFT JOIN public.inventory i ON i.id = x.inventory_id WHERE x.transfer_id = t.id), '[]'::json) AS lines
      FROM public.stock_transfers t
      JOIN public.warehouse_locations s ON s.id = t.source_location_id
      JOIN public.warehouse_locations d ON d.id = t.destination_location_id
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createStockTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const outletId = Number(req.body.outletId);
    const sourceLocationId = Number(req.body.sourceLocationId);
    const destinationLocationId = Number(req.body.destinationLocationId);
    const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (!outletId || !sourceLocationId || !destinationLocationId || sourceLocationId === destinationLocationId || lines.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Transfer membutuhkan outlet, lokasi berbeda, dan lines' } });
    }
    await assertOutlet(tenantId, outletId);
    const source = await assertLocation(tenantId, sourceLocationId);
    const destination = await assertLocation(tenantId, destinationLocationId);
    if (source.outlet_id !== outletId || destination.outlet_id !== outletId) return res.status(400).json({ success: false, error: { code: 'LOCATION_OUTLET_MISMATCH', message: 'Lokasi transfer harus berada pada outlet yang sama' } });

    const inventoryIds = lines.map((line: any) => Number(line.inventoryId));
    const inventory = await prisma.inventory.findMany({ where: { id: { in: inventoryIds }, outlet_id: outletId, is_active: true }, select: { id: true } });
    if (inventory.length !== new Set(inventoryIds).size) return res.status(400).json({ success: false, error: { code: 'INVALID_INVENTORY', message: 'Ada inventory yang bukan milik outlet ini' } });

    const transfer = await prisma.$transaction(async (tx) => {
      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.stock_transfer_number_seq') AS seq`);
      const transferNumber = `TRF-${new Date().getFullYear()}-${String(Number(sequence[0].seq)).padStart(6, '0')}`;
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.stock_transfers (tenant_id, outlet_id, transfer_number, source_location_id, destination_location_id, status, notes, created_by)
        VALUES (${tenantId}, ${outletId}, ${transferNumber}, ${sourceLocationId}, ${destinationLocationId}, 'ready', ${req.body.notes || null}, ${req.userId || null})
        RETURNING *
      `);
      for (const line of lines) {
        const quantity = Number(line.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) throw Object.assign(new Error('Quantity transfer harus > 0'), { status: 400, code: 'INVALID_QUANTITY' });
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.stock_transfer_lines (transfer_id, inventory_id, quantity_requested)
          VALUES (${rows[0].id}, ${Number(line.inventoryId)}, ${quantity})
        `);
      }
      return rows[0];
    });
    res.status(201).json({ success: true, data: transfer, message: 'Stock transfer created' });
  } catch (error) {
    next(error);
  }
};

export const executeStockTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const transferId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const transfers = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_transfers WHERE id = ${transferId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const transfer = transfers[0];
      if (!transfer) throw Object.assign(new Error('Transfer tidak ditemukan'), { status: 404, code: 'TRANSFER_NOT_FOUND' });
      if (transfer.status !== 'ready') throw Object.assign(new Error('Hanya transfer ready yang bisa dieksekusi'), { status: 409, code: 'INVALID_TRANSFER_STATUS' });
      const lines = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_transfer_lines WHERE transfer_id = ${transferId} ORDER BY id`);

      for (const line of lines) {
        const quantity = Number(line.quantity_requested);
        const sourceRows = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.warehouse_stock_balances
          WHERE tenant_id = ${tenantId} AND location_id = ${transfer.source_location_id} AND inventory_id = ${line.inventory_id}
          FOR UPDATE
        `);
        const source = sourceRows[0];
        const sourceBefore = Number(source?.quantity || 0);
        if (sourceBefore < quantity) throw Object.assign(new Error(`Stock lokasi sumber tidak cukup untuk inventory ${line.inventory_id}`), { status: 409, code: 'INSUFFICIENT_LOCATION_STOCK' });
        const sourceAfter = sourceBefore - quantity;
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.warehouse_stock_balances SET quantity = ${sourceAfter}, updated_at = NOW()
          WHERE id = ${source.id}
        `);

        const destinationRows = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.warehouse_stock_balances
          WHERE tenant_id = ${tenantId} AND location_id = ${transfer.destination_location_id} AND inventory_id = ${line.inventory_id}
          FOR UPDATE
        `);
        const destinationBefore = Number(destinationRows[0]?.quantity || 0);
        const destinationAfter = destinationBefore + quantity;
        if (destinationRows[0]) {
          await tx.$executeRaw(Prisma.sql`UPDATE public.warehouse_stock_balances SET quantity = ${destinationAfter}, updated_at = NOW() WHERE id = ${destinationRows[0].id}`);
        } else {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.warehouse_stock_balances (tenant_id, outlet_id, location_id, inventory_id, quantity)
            VALUES (${tenantId}, ${transfer.outlet_id}, ${transfer.destination_location_id}, ${line.inventory_id}, ${destinationAfter})
          `);
        }
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.warehouse_stock_ledger (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes, created_by)
          VALUES
            (${tenantId}, ${transfer.outlet_id}, ${transfer.source_location_id}, ${line.inventory_id}, 'transfer_out', ${-quantity}, ${sourceBefore}, ${sourceAfter}, 'stock_transfer', ${String(transferId)}, ${transfer.transfer_number}, ${req.userId || null}),
            (${tenantId}, ${transfer.outlet_id}, ${transfer.destination_location_id}, ${line.inventory_id}, 'transfer_in', ${quantity}, ${destinationBefore}, ${destinationAfter}, 'stock_transfer', ${String(transferId)}, ${transfer.transfer_number}, ${req.userId || null})
        `);
        await tx.$executeRaw(Prisma.sql`UPDATE public.stock_transfer_lines SET quantity_done = ${quantity} WHERE id = ${line.id}`);
      }
      const updated = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.stock_transfers SET status = 'done', completed_by = ${req.userId || null}, completed_at = NOW(), updated_at = NOW()
        WHERE id = ${transferId} AND tenant_id = ${tenantId} RETURNING *
      `);
      return updated[0];
    });
    res.json({ success: true, data: result, message: 'Transfer completed without changing aggregate stock' });
  } catch (error) {
    next(error);
  }
};

export const createStockCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const locationId = Number(req.body.locationId);
    const location = await assertLocation(tenantId, locationId);
    const balances = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.warehouse_stock_balances WHERE tenant_id = ${tenantId} AND location_id = ${locationId} ORDER BY inventory_id
    `);
    const result = await prisma.$transaction(async (tx) => {
      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.stock_count_number_seq') AS seq`);
      const countNumber = `CNT-${new Date().getFullYear()}-${String(Number(sequence[0].seq)).padStart(6, '0')}`;
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.stock_counts (tenant_id, outlet_id, location_id, count_number, status, notes, created_by)
        VALUES (${tenantId}, ${location.outlet_id}, ${locationId}, ${countNumber}, 'counting', ${req.body.notes || null}, ${req.userId || null})
        RETURNING *
      `);
      for (const balance of balances) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.stock_count_lines (stock_count_id, inventory_id, expected_quantity)
          VALUES (${rows[0].id}, ${balance.inventory_id}, ${balance.quantity})
        `);
      }
      return rows[0];
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getStockCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT c.*, l.code AS location_code, l.name AS location_name,
        COALESCE((SELECT json_agg(json_build_object('id', x.id, 'inventoryId', x.inventory_id, 'inventoryName', i.name, 'expectedQuantity', x.expected_quantity, 'countedQuantity', x.counted_quantity, 'varianceQuantity', x.variance_quantity) ORDER BY x.id)
          FROM public.stock_count_lines x LEFT JOIN public.inventory i ON i.id = x.inventory_id WHERE x.stock_count_id = c.id), '[]'::json) AS lines
      FROM public.stock_counts c JOIN public.warehouse_locations l ON l.id = c.location_id
      WHERE c.tenant_id = ${tenantId} ORDER BY c.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const finalizeStockCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const stockCountId = Number(req.params.id);
    const submitted = Array.isArray(req.body.lines) ? req.body.lines : [];
    const submittedMap = new Map<number, number>(
      submitted.map((line: any) => [Number(line.inventoryId), Number(line.countedQuantity)] as [number, number])
    );

    const result = await prisma.$transaction(async (tx) => {
      const counts = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_counts WHERE id = ${stockCountId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const count = counts[0];
      if (!count) throw Object.assign(new Error('Stock count tidak ditemukan'), { status: 404, code: 'COUNT_NOT_FOUND' });
      if (count.status !== 'counting') throw Object.assign(new Error('Stock count sudah tidak bisa difinalisasi'), { status: 409, code: 'INVALID_COUNT_STATUS' });
      const lines = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_count_lines WHERE stock_count_id = ${stockCountId} ORDER BY id`);

      for (const line of lines) {
        const inventoryId = Number(line.inventory_id);
        if (!submittedMap.has(inventoryId)) throw Object.assign(new Error(`Counted quantity belum diisi untuk inventory ${line.inventory_id}`), { status: 400, code: 'COUNT_INCOMPLETE' });
        const counted = submittedMap.get(inventoryId)!;
        if (!Number.isFinite(counted) || counted < 0) throw Object.assign(new Error('Counted quantity tidak valid'), { status: 400, code: 'INVALID_COUNTED_QUANTITY' });
        const expected = Number(line.expected_quantity || 0);
        const variance = counted - expected;

        const balanceRows = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.warehouse_stock_balances WHERE tenant_id = ${tenantId} AND location_id = ${count.location_id} AND inventory_id = ${inventoryId} FOR UPDATE
        `);
        const balanceBefore = Number(balanceRows[0]?.quantity || 0);
        if (balanceRows[0]) {
          await tx.$executeRaw(Prisma.sql`UPDATE public.warehouse_stock_balances SET quantity = ${counted}, updated_at = NOW() WHERE id = ${balanceRows[0].id}`);
        } else {
          await tx.$executeRaw(Prisma.sql`INSERT INTO public.warehouse_stock_balances (tenant_id, outlet_id, location_id, inventory_id, quantity) VALUES (${tenantId}, ${count.outlet_id}, ${count.location_id}, ${inventoryId}, ${counted})`);
        }
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.warehouse_stock_ledger (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes, created_by)
          VALUES (${tenantId}, ${count.outlet_id}, ${count.location_id}, ${inventoryId}, 'count_adjustment', ${counted - balanceBefore}, ${balanceBefore}, ${counted}, 'stock_count', ${String(stockCountId)}, ${count.count_number}, ${req.userId || null})
        `);

        if (variance !== 0) {
          const inventory = await tx.inventory.findFirst({ where: { id: inventoryId, outlet_id: Number(count.outlet_id) } });
          if (!inventory) throw Object.assign(new Error(`Inventory ${inventoryId} tidak ditemukan`), { status: 404, code: 'INVENTORY_NOT_FOUND' });
          const aggregateBefore = Number(inventory.current_stock || 0);
          const aggregateAfter = aggregateBefore + variance;
          if (aggregateAfter < 0) throw Object.assign(new Error('Variance membuat aggregate stock negatif'), { status: 409, code: 'NEGATIVE_AGGREGATE_STOCK' });
          await tx.inventory.update({ where: { id: inventory.id }, data: { current_stock: aggregateAfter } });
          await tx.stock_movements.create({
            data: {
              outlet_id: Number(count.outlet_id),
              inventory_id: inventory.id,
              type: 'ADJUST',
              quantity: Math.abs(variance),
              unit_price: Number(inventory.cost_amount || 0),
              total_cost: Math.abs(variance) * Number(inventory.cost_amount || 0),
              stock_before: aggregateBefore,
              stock_after: aggregateAfter,
              notes: `Stock count ${count.count_number}; variance ${variance}`,
              user_id: req.userId!
            }
          });
        }
        await tx.$executeRaw(Prisma.sql`UPDATE public.stock_count_lines SET counted_quantity = ${counted}, variance_quantity = ${variance} WHERE id = ${line.id}`);
      }
      const updated = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.stock_counts SET status = 'finalized', finalized_by = ${req.userId || null}, finalized_at = NOW()
        WHERE id = ${stockCountId} AND tenant_id = ${tenantId} RETURNING *
      `);
      return updated[0];
    });
    res.json({ success: true, data: result, message: 'Stock count finalized and aggregate inventory reconciled' });
  } catch (error) {
    next(error);
  }
};

export const createBarcodeAlias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const outletId = Number(req.body.outletId);
    const inventoryId = Number(req.body.inventoryId);
    const barcode = String(req.body.barcode || '').trim();
    const aliasType = String(req.body.aliasType || 'internal');
    if (!outletId || !inventoryId || !barcode) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet, inventory dan barcode wajib diisi' } });
    await assertOutlet(tenantId, outletId);
    const inventory = await prisma.inventory.findFirst({ where: { id: inventoryId, outlet_id: outletId, is_active: true } });
    if (!inventory) return res.status(404).json({ success: false, error: { code: 'INVENTORY_NOT_FOUND', message: 'Inventory tidak ditemukan' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.barcode_aliases (tenant_id, outlet_id, inventory_id, barcode, alias_type, created_by)
      VALUES (${tenantId}, ${outletId}, ${inventoryId}, ${barcode}, ${aliasType}, ${req.userId || null})
      RETURNING *
    `);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const resolveBarcode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdFrom(req);
    const barcode = String(req.params.barcode || '').trim();
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT b.*, i.name, i.sku, i.unit, i.current_stock, i.min_stock
      FROM public.barcode_aliases b JOIN public.inventory i ON i.id = b.inventory_id
      WHERE b.tenant_id = ${tenantId} AND b.barcode = ${barcode} AND b.is_active = TRUE LIMIT 1
    `);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'BARCODE_NOT_FOUND', message: 'Barcode belum terdaftar' } });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
