import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const assertOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true, name: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
  return outlet;
};

const appendProcurementEvent = async (
  tx: Prisma.TransactionClient,
  input: {
    tenantId: number;
    outletId: number;
    eventType: string;
    referenceType: string;
    referenceId: string | number;
    payload?: Record<string, unknown>;
    userId?: number | null;
  }
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.procurement_event_ledger
      (tenant_id, outlet_id, event_type, reference_type, reference_id, payload, created_by)
    VALUES
      (${input.tenantId}, ${input.outletId}, ${input.eventType}, ${input.referenceType}, ${String(input.referenceId)}, CAST(${JSON.stringify(input.payload || {})} AS jsonb), ${input.userId || null})
  `);
};

export const getPurchaseRfqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT r.*,
        o.name AS outlet_name,
        ss.name AS selected_supplier_name,
        po.po_number AS converted_po_number,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ri.id,
            'inventoryId', ri.inventory_id,
            'inventoryName', inv.name,
            'sku', inv.sku,
            'quantity', ri.quantity,
            'unit', ri.unit,
            'targetUnitPrice', ri.target_unit_price,
            'notes', ri.notes
          ) ORDER BY ri.id)
          FROM public.purchase_rfq_items ri
          LEFT JOIN public.inventory inv ON inv.id = ri.inventory_id
          WHERE ri.rfq_id = r.id
        ), '[]'::json) AS items,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', rs.id,
            'supplierId', rs.supplier_id,
            'supplierName', s.name,
            'status', rs.status,
            'quoteReference', rs.quote_reference,
            'quotedTotal', rs.quoted_total,
            'leadTimeDays', rs.lead_time_days,
            'validUntil', rs.valid_until,
            'notes', rs.notes,
            'respondedAt', rs.responded_at,
            'items', COALESCE((
              SELECT json_agg(json_build_object(
                'id', rsi.id,
                'rfqItemId', rsi.rfq_item_id,
                'unitPrice', rsi.unit_price,
                'availableQuantity', rsi.available_quantity,
                'notes', rsi.notes
              ) ORDER BY rsi.id)
              FROM public.purchase_rfq_supplier_items rsi
              WHERE rsi.rfq_supplier_id = rs.id
            ), '[]'::json)
          ) ORDER BY s.name)
          FROM public.purchase_rfq_suppliers rs
          JOIN public.suppliers s ON s.id = rs.supplier_id
          WHERE rs.rfq_id = r.id
        ), '[]'::json) AS suppliers
      FROM public.purchase_rfqs r
      LEFT JOIN public.outlets o ON o.id = r.outlet_id
      LEFT JOIN public.suppliers ss ON ss.id = r.selected_supplier_id
      LEFT JOIN public.purchase_orders po ON po.id = r.converted_po_id
      WHERE r.tenant_id = ${tenantId}
      ORDER BY r.created_at DESC, r.id DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseRfq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletId = Number(req.body.outletId);
    const supplierIds = Array.isArray(req.body.supplierIds)
      ? [...new Set(req.body.supplierIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0))] as number[]
      : [];
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!outletId || supplierIds.length === 0 || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'RFQ_INPUT_REQUIRED', message: 'RFQ membutuhkan outlet, minimal satu supplier, dan minimal satu item' } });
    }
    await assertOutlet(tenantId, outletId);

    const suppliers = await prisma.suppliers.findMany({ where: { id: { in: supplierIds }, outlet_id: outletId, is_active: true }, select: { id: true, name: true } });
    if (suppliers.length !== supplierIds.length) return res.status(400).json({ success: false, error: { code: 'INVALID_RFQ_SUPPLIER', message: 'Ada supplier yang bukan milik outlet ini' } });

    const inventoryIds = [...new Set(items.map((item: any) => Number(item.inventoryId)))] as number[];
    const inventory = await prisma.inventory.findMany({ where: { id: { in: inventoryIds }, outlet_id: outletId, is_active: true }, select: { id: true, name: true, unit: true, cost_amount: true } });
    if (inventory.length !== inventoryIds.length) return res.status(400).json({ success: false, error: { code: 'INVALID_RFQ_INVENTORY', message: 'Ada inventory yang bukan milik outlet ini' } });
    const inventoryMap = new Map(inventory.map((row) => [row.id, row]));

    const normalizedItems = items.map((item: any) => {
      const inventoryItem = inventoryMap.get(Number(item.inventoryId));
      if (!inventoryItem) throw Object.assign(new Error('Inventory RFQ tidak ditemukan'), { status: 400, code: 'INVALID_RFQ_INVENTORY' });
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw Object.assign(new Error(`Quantity RFQ untuk ${inventoryItem.name} harus > 0`), { status: 400, code: 'INVALID_RFQ_QUANTITY' });
      const targetUnitPrice = item.targetUnitPrice === undefined || item.targetUnitPrice === null || item.targetUnitPrice === ''
        ? Number(inventoryItem.cost_amount || 0)
        : Number(item.targetUnitPrice);
      if (!Number.isFinite(targetUnitPrice) || targetUnitPrice < 0) throw Object.assign(new Error('Target unit price RFQ tidak valid'), { status: 400, code: 'INVALID_RFQ_TARGET_PRICE' });
      return {
        inventoryId: inventoryItem.id,
        quantity,
        unit: String(item.unit || inventoryItem.unit || 'unit'),
        targetUnitPrice,
        notes: item.notes ? String(item.notes) : null,
      };
    });

    const created = await prisma.$transaction(async (tx) => {
      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.purchase_rfq_number_seq') AS seq`);
      const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(Number(sequence[0].seq)).padStart(6, '0')}`;
      const rfqs = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.purchase_rfqs
          (tenant_id, outlet_id, rfq_number, status, required_date, notes, created_by)
        VALUES
          (${tenantId}, ${outletId}, ${rfqNumber}, 'draft', ${req.body.requiredDate ? new Date(req.body.requiredDate) : null}, ${req.body.notes || null}, ${req.userId || null})
        RETURNING *
      `);
      const rfq = rfqs[0];
      for (const item of normalizedItems) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.purchase_rfq_items
            (rfq_id, inventory_id, quantity, unit, target_unit_price, notes)
          VALUES
            (${rfq.id}, ${item.inventoryId}, ${item.quantity}, ${item.unit}, ${item.targetUnitPrice}, ${item.notes})
        `);
      }
      for (const supplierId of supplierIds) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.purchase_rfq_suppliers (rfq_id, supplier_id)
          VALUES (${rfq.id}, ${supplierId})
        `);
      }
      await appendProcurementEvent(tx, {
        tenantId,
        outletId,
        eventType: 'rfq_created',
        referenceType: 'rfq',
        referenceId: rfq.id,
        payload: { rfqNumber, supplierIds, itemCount: normalizedItems.length },
        userId: req.userId,
      });
      return rfq;
    });

    res.status(201).json({ success: true, data: created, message: 'RFQ created' });
  } catch (error) {
    next(error);
  }
};

export const sendPurchaseRfq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rfqId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfqs WHERE id = ${rfqId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const rfq = rows[0];
      if (!rfq) throw Object.assign(new Error('RFQ tidak ditemukan'), { status: 404, code: 'RFQ_NOT_FOUND' });
      if (rfq.status !== 'draft') throw Object.assign(new Error('Hanya RFQ draft yang bisa dikirim'), { status: 409, code: 'INVALID_RFQ_STATUS' });
      const updated = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.purchase_rfqs SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = ${rfqId} AND tenant_id = ${tenantId} RETURNING *
      `);
      await appendProcurementEvent(tx, { tenantId, outletId: Number(rfq.outlet_id), eventType: 'rfq_sent', referenceType: 'rfq', referenceId: rfqId, userId: req.userId });
      return updated[0];
    });
    res.json({ success: true, data: result, message: 'RFQ marked sent to invited suppliers' });
  } catch (error) {
    next(error);
  }
};

export const submitSupplierRfqQuote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rfqId = Number(req.params.id);
    const supplierId = Number(req.params.supplierId);
    const itemQuotes = Array.isArray(req.body.items) ? req.body.items : [];
    if (itemQuotes.length === 0) return res.status(400).json({ success: false, error: { code: 'QUOTE_ITEMS_REQUIRED', message: 'Supplier quote membutuhkan item prices' } });

    const result = await prisma.$transaction(async (tx) => {
      const rfqs = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfqs WHERE id = ${rfqId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const rfq = rfqs[0];
      if (!rfq) throw Object.assign(new Error('RFQ tidak ditemukan'), { status: 404, code: 'RFQ_NOT_FOUND' });
      if (!['sent', 'quoted'].includes(rfq.status)) throw Object.assign(new Error('RFQ belum dikirim atau sudah ditutup'), { status: 409, code: 'INVALID_RFQ_STATUS' });
      const supplierRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT rs.* FROM public.purchase_rfq_suppliers rs
        JOIN public.suppliers s ON s.id = rs.supplier_id
        WHERE rs.rfq_id = ${rfqId} AND rs.supplier_id = ${supplierId} AND s.outlet_id = ${rfq.outlet_id}
        FOR UPDATE
      `);
      const supplierLink = supplierRows[0];
      if (!supplierLink) throw Object.assign(new Error('Supplier tidak diundang pada RFQ ini'), { status: 404, code: 'RFQ_SUPPLIER_NOT_FOUND' });
      const rfqItems = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfq_items WHERE rfq_id = ${rfqId} ORDER BY id`);
      const quoteMap = new Map<number, any>(itemQuotes.map((item: any) => [Number(item.rfqItemId), item]));
      if (rfqItems.some((item) => !quoteMap.has(Number(item.id)))) throw Object.assign(new Error('Supplier quote harus mengisi seluruh item RFQ'), { status: 400, code: 'INCOMPLETE_SUPPLIER_QUOTE' });

      await tx.$executeRaw(Prisma.sql`DELETE FROM public.purchase_rfq_supplier_items WHERE rfq_supplier_id = ${supplierLink.id}`);
      let quotedTotal = 0;
      for (const rfqItem of rfqItems) {
        const quote = quoteMap.get(Number(rfqItem.id));
        const unitPrice = Number(quote.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) throw Object.assign(new Error('Supplier unit price tidak valid'), { status: 400, code: 'INVALID_SUPPLIER_PRICE' });
        const availableQuantity = quote.availableQuantity === undefined || quote.availableQuantity === null || quote.availableQuantity === '' ? null : Number(quote.availableQuantity);
        if (availableQuantity !== null && (!Number.isFinite(availableQuantity) || availableQuantity < 0)) throw Object.assign(new Error('Available quantity supplier tidak valid'), { status: 400, code: 'INVALID_AVAILABLE_QTY' });
        quotedTotal += Number(rfqItem.quantity) * unitPrice;
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.purchase_rfq_supplier_items
            (rfq_supplier_id, rfq_item_id, unit_price, available_quantity, notes)
          VALUES
            (${supplierLink.id}, ${rfqItem.id}, ${unitPrice}, ${availableQuantity}, ${quote.notes || null})
        `);
      }
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.purchase_rfq_suppliers
        SET status = 'responded', quote_reference = ${req.body.quoteReference || null}, quoted_total = ${quotedTotal}, lead_time_days = ${req.body.leadTimeDays === undefined ? null : Number(req.body.leadTimeDays)}, valid_until = ${req.body.validUntil ? new Date(req.body.validUntil) : null}, notes = ${req.body.notes || null}, responded_at = NOW(), updated_at = NOW()
        WHERE id = ${supplierLink.id}
      `);
      await tx.$executeRaw(Prisma.sql`UPDATE public.purchase_rfqs SET status = 'quoted', updated_at = NOW() WHERE id = ${rfqId} AND tenant_id = ${tenantId}`);
      await appendProcurementEvent(tx, {
        tenantId,
        outletId: Number(rfq.outlet_id),
        eventType: 'supplier_quote_received',
        referenceType: 'rfq',
        referenceId: rfqId,
        payload: { supplierId, quotedTotal, leadTimeDays: req.body.leadTimeDays ?? null },
        userId: req.userId,
      });
      return { supplierId, quotedTotal };
    });

    res.json({ success: true, data: result, message: 'Supplier quote recorded' });
  } catch (error) {
    next(error);
  }
};

export const selectRfqSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rfqId = Number(req.params.id);
    const supplierId = Number(req.body.supplierId);
    const result = await prisma.$transaction(async (tx) => {
      const rfqs = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfqs WHERE id = ${rfqId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const rfq = rfqs[0];
      if (!rfq) throw Object.assign(new Error('RFQ tidak ditemukan'), { status: 404, code: 'RFQ_NOT_FOUND' });
      if (rfq.status !== 'quoted') throw Object.assign(new Error('Supplier hanya bisa dipilih setelah quote diterima'), { status: 409, code: 'INVALID_RFQ_STATUS' });
      const supplierRows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfq_suppliers WHERE rfq_id = ${rfqId} AND supplier_id = ${supplierId} AND status = 'responded' FOR UPDATE`);
      if (!supplierRows[0]) throw Object.assign(new Error('Supplier belum memberikan quote valid'), { status: 409, code: 'SUPPLIER_QUOTE_REQUIRED' });
      await tx.$executeRaw(Prisma.sql`UPDATE public.purchase_rfq_suppliers SET status = CASE WHEN supplier_id = ${supplierId} THEN 'selected' ELSE status END, updated_at = NOW() WHERE rfq_id = ${rfqId}`);
      const updated = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.purchase_rfqs SET status = 'selected', selected_supplier_id = ${supplierId}, updated_at = NOW()
        WHERE id = ${rfqId} AND tenant_id = ${tenantId} RETURNING *
      `);
      await appendProcurementEvent(tx, { tenantId, outletId: Number(rfq.outlet_id), eventType: 'supplier_selected', referenceType: 'rfq', referenceId: rfqId, payload: { supplierId }, userId: req.userId });
      return updated[0];
    });
    res.json({ success: true, data: result, message: 'Supplier selected' });
  } catch (error) {
    next(error);
  }
};

export const convertRfqToPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rfqId = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const rfqs = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfqs WHERE id = ${rfqId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const rfq = rfqs[0];
      if (!rfq) throw Object.assign(new Error('RFQ tidak ditemukan'), { status: 404, code: 'RFQ_NOT_FOUND' });
      if (rfq.status === 'converted' && rfq.converted_po_id) {
        const existing = await tx.purchase_orders.findUnique({ where: { id: Number(rfq.converted_po_id) }, include: { purchase_order_items: true } });
        if (existing) return existing;
      }
      if (rfq.status !== 'selected' || !rfq.selected_supplier_id) throw Object.assign(new Error('RFQ harus memiliki selected supplier sebelum conversion'), { status: 409, code: 'RFQ_SUPPLIER_NOT_SELECTED' });

      const selectedLinks = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfq_suppliers WHERE rfq_id = ${rfqId} AND supplier_id = ${rfq.selected_supplier_id} AND status = 'selected' LIMIT 1`);
      const selectedLink = selectedLinks[0];
      if (!selectedLink) throw Object.assign(new Error('Selected supplier quote tidak ditemukan'), { status: 409, code: 'SELECTED_QUOTE_NOT_FOUND' });
      const quotedItems = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT ri.inventory_id, ri.quantity, ri.unit, rsi.unit_price
        FROM public.purchase_rfq_items ri
        JOIN public.purchase_rfq_supplier_items rsi ON rsi.rfq_item_id = ri.id AND rsi.rfq_supplier_id = ${selectedLink.id}
        WHERE ri.rfq_id = ${rfqId}
        ORDER BY ri.id
      `);
      const rfqItemCount = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(*)::int AS count FROM public.purchase_rfq_items WHERE rfq_id = ${rfqId}`);
      if (quotedItems.length !== Number(rfqItemCount[0].count)) throw Object.assign(new Error('Selected supplier quote tidak lengkap'), { status: 409, code: 'INCOMPLETE_SELECTED_QUOTE' });

      const poNumber = `PO-${String(rfq.rfq_number).replace(/^RFQ-/, '')}`;
      const subtotal = quotedItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
      const po = await tx.purchase_orders.create({
        data: {
          outlet_id: Number(rfq.outlet_id),
          po_number: poNumber,
          supplier_id: Number(rfq.selected_supplier_id),
          status: 'draft',
          expected_date: rfq.required_date ? new Date(rfq.required_date) : null,
          subtotal,
          total: subtotal,
          notes: [rfq.notes, `Converted from ${rfq.rfq_number}`].filter(Boolean).join('\n'),
          created_by: req.userId!,
          purchase_order_items: {
            create: quotedItems.map((item) => ({
              inventory_id: Number(item.inventory_id),
              quantity: Number(item.quantity),
              unit: String(item.unit),
              unit_price: Number(item.unit_price),
              subtotal: Number(item.quantity) * Number(item.unit_price),
            })),
          },
        },
        include: { purchase_order_items: true, suppliers: true },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.purchase_rfqs SET status = 'converted', converted_po_id = ${po.id}, converted_at = NOW(), updated_at = NOW()
        WHERE id = ${rfqId} AND tenant_id = ${tenantId}
      `);
      await appendProcurementEvent(tx, { tenantId, outletId: Number(rfq.outlet_id), eventType: 'rfq_converted_to_po', referenceType: 'rfq', referenceId: rfqId, payload: { poId: po.id, poNumber, supplierId: Number(rfq.selected_supplier_id), total: subtotal }, userId: req.userId });
      return po;
    });
    res.status(201).json({ success: true, data: result, message: 'RFQ converted to draft purchase order' });
  } catch (error) {
    next(error);
  }
};
