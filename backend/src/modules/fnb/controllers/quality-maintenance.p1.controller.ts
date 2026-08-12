import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const assertOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const jsonObject = (value: unknown, field: string) => {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error(`${field} harus berupa object JSON`), { status: 400, code: 'INVALID_JSON_OBJECT' });
  }
  return value as Record<string, unknown>;
};

const validateQualityTarget = async (
  tenantId: number,
  outletId: number,
  inventoryId: number | null,
  itemId: number | null,
  referenceType: string | null,
  referenceId: string | null,
) => {
  if (inventoryId && itemId) {
    throw Object.assign(new Error('QC hanya boleh menargetkan satu inventory atau satu item'), { status: 400, code: 'QC_TARGET_AMBIGUOUS' });
  }

  if (inventoryId) {
    const inventory = await prisma.inventory.findFirst({ where: { id: inventoryId, outlet_id: outletId, is_active: true }, select: { id: true } });
    if (!inventory) throw Object.assign(new Error('Inventory target QC tidak ditemukan pada outlet'), { status: 404, code: 'QC_INVENTORY_NOT_FOUND' });
  }

  if (itemId) {
    const item = await prisma.items.findFirst({ where: { id: itemId, outlet_id: outletId, is_active: true }, select: { id: true } });
    if (!item) throw Object.assign(new Error('Item target QC tidak ditemukan pada outlet'), { status: 404, code: 'QC_ITEM_NOT_FOUND' });
  }

  if (referenceType === 'manufacturing_order') {
    const moId = Number(referenceId);
    if (!Number.isInteger(moId) || moId <= 0) {
      throw Object.assign(new Error('Reference manufacturing order tidak valid'), { status: 400, code: 'QC_REFERENCE_INVALID' });
    }
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, item_id, outlet_id FROM public.manufacturing_orders
      WHERE id = ${moId} AND tenant_id = ${tenantId} AND outlet_id = ${outletId}
      LIMIT 1
    `);
    if (!rows[0]) throw Object.assign(new Error('Manufacturing order reference tidak ditemukan'), { status: 404, code: 'QC_MO_NOT_FOUND' });
    if (itemId && Number(rows[0].item_id) !== itemId) {
      throw Object.assign(new Error('Item QC tidak sesuai dengan finished product MO'), { status: 409, code: 'QC_REFERENCE_MISMATCH' });
    }
    return { manufacturingItemId: Number(rows[0].item_id) };
  }

  return { manufacturingItemId: null as number | null };
};

export const getQualityChecks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT q.*, i.name AS inventory_name, p.name AS item_name, o.name AS outlet_name
      FROM public.quality_checks q
      LEFT JOIN public.inventory i ON i.id = q.inventory_id
      LEFT JOIN public.items p ON p.id = q.item_id
      LEFT JOIN public.outlets o ON o.id = q.outlet_id
      WHERE q.tenant_id = ${tenantId}
      ORDER BY CASE q.status WHEN 'pending' THEN 0 WHEN 'fail' THEN 1 ELSE 2 END, q.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createQualityCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletId = Number(req.body.outletId);
    const checkType = String(req.body.checkType || '').trim();
    if (!outletId || !checkType) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet dan check type wajib diisi' } });
    await assertOutlet(tenantId, outletId);

    const inventoryId = req.body.inventoryId === undefined || req.body.inventoryId === null ? null : Number(req.body.inventoryId);
    const requestedItemId = req.body.itemId === undefined || req.body.itemId === null ? null : Number(req.body.itemId);
    if ((inventoryId !== null && (!Number.isInteger(inventoryId) || inventoryId <= 0)) || (requestedItemId !== null && (!Number.isInteger(requestedItemId) || requestedItemId <= 0))) {
      return res.status(400).json({ success: false, error: { code: 'QC_TARGET_INVALID', message: 'Inventory/item target QC tidak valid' } });
    }

    const referenceType = req.body.referenceType ? String(req.body.referenceType).trim() : null;
    const referenceId = req.body.referenceId === undefined || req.body.referenceId === null ? null : String(req.body.referenceId);
    if (checkType === 'production_output' && (referenceType !== 'manufacturing_order' || !referenceId)) {
      return res.status(400).json({ success: false, error: { code: 'PRODUCTION_QC_REFERENCE_REQUIRED', message: 'Production output QC wajib mereferensikan manufacturing order' } });
    }

    const target = await validateQualityTarget(tenantId, outletId, inventoryId, requestedItemId, referenceType, referenceId);
    const itemId = requestedItemId || target.manufacturingItemId;

    if (checkType === 'production_output' && referenceType && referenceId) {
      const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM public.quality_checks
        WHERE tenant_id = ${tenantId}
          AND outlet_id = ${outletId}
          AND check_type = 'production_output'
          AND reference_type = ${referenceType}
          AND reference_id = ${referenceId}
          AND status = 'pending'
        LIMIT 1
      `);
      if (existing[0]) return res.status(409).json({ success: false, error: { code: 'QC_ALREADY_PENDING', message: 'Production QC untuk reference ini masih pending' } });
    }

    const criteria = JSON.stringify(jsonObject(req.body.criteria, 'criteria'));
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.quality_checks
        (tenant_id, outlet_id, check_type, reference_type, reference_id, inventory_id, item_id, status, criteria, notes, created_by)
      VALUES
        (${tenantId}, ${outletId}, ${checkType}, ${referenceType}, ${referenceId}, ${inventoryId}, ${itemId}, 'pending', CAST(${criteria} AS jsonb), ${req.body.notes || null}, ${req.userId || null})
      RETURNING *
    `);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const resolveQualityCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = Number(req.params.id);
    const status = String(req.body.status || '');
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_QC_ID', message: 'QC ID tidak valid' } });
    if (!['pass', 'fail', 'waived'].includes(status)) return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status QC harus pass/fail/waived' } });
    const notes = req.body.notes === undefined || req.body.notes === null ? null : String(req.body.notes).trim();
    if ((status === 'fail' || status === 'waived') && !notes) {
      return res.status(400).json({ success: false, error: { code: 'QC_REASON_REQUIRED', message: 'QC fail/waived wajib memiliki alasan' } });
    }
    const measurements = JSON.stringify(jsonObject(req.body.measurements, 'measurements'));

    const resolved = await prisma.$transaction(async (tx) => {
      const current = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.quality_checks WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `);
      if (!current[0]) throw Object.assign(new Error('QC tidak ditemukan'), { status: 404, code: 'QC_NOT_FOUND' });
      if (current[0].status !== 'pending') throw Object.assign(new Error('QC sudah diselesaikan'), { status: 409, code: 'QC_ALREADY_RESOLVED' });

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.quality_checks
        SET status = ${status}, measurements = CAST(${measurements} AS jsonb), notes = COALESCE(${notes}, notes), checked_by = ${req.userId || null}, checked_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('QC berubah saat diproses'), { status: 409, code: 'QC_CONCURRENT_UPDATE' });
      return rows[0];
    });
    res.json({ success: true, data: resolved });
  } catch (error) {
    next(error);
  }
};

export const getEquipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT e.*, o.name AS outlet_name,
        COALESCE((SELECT COUNT(*)::int FROM public.maintenance_requests r WHERE r.equipment_id = e.id AND r.tenant_id = e.tenant_id AND r.status NOT IN ('done','cancelled')), 0) AS open_requests
      FROM public.maintenance_equipment e
      LEFT JOIN public.outlets o ON o.id = e.outlet_id
      WHERE e.tenant_id = ${tenantId} AND e.is_active = TRUE
      ORDER BY CASE e.status WHEN 'down' THEN 0 WHEN 'maintenance' THEN 1 ELSE 2 END, e.name
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createEquipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletId = Number(req.body.outletId);
    const code = String(req.body.code || '').trim().toUpperCase();
    const name = String(req.body.name || '').trim();
    if (!outletId || !code || !name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet, code dan equipment name wajib diisi' } });
    await assertOutlet(tenantId, outletId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.maintenance_equipment
        (tenant_id, outlet_id, code, name, category, serial_number, purchase_date, next_maintenance_at, notes)
      VALUES
        (${tenantId}, ${outletId}, ${code}, ${name}, ${req.body.category || null}, ${req.body.serialNumber || null}, ${req.body.purchaseDate ? new Date(req.body.purchaseDate) : null}, ${req.body.nextMaintenanceAt ? new Date(req.body.nextMaintenanceAt) : null}, ${req.body.notes || null})
      RETURNING *
    `);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT r.*, e.code AS equipment_code, e.name AS equipment_name, e.status AS equipment_status, o.name AS outlet_name, u.name AS assigned_user_name
      FROM public.maintenance_requests r
      JOIN public.maintenance_equipment e ON e.id = r.equipment_id
      LEFT JOIN public.outlets o ON o.id = r.outlet_id
      LEFT JOIN public.users u ON u.id = r.assigned_user_id
      WHERE r.tenant_id = ${tenantId}
      ORDER BY CASE r.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, r.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const equipmentId = Number(req.body.equipmentId);
    const title = String(req.body.title || '').trim();
    if (!equipmentId || !title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Equipment dan title wajib diisi' } });
    const equipmentRows = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.maintenance_equipment WHERE id = ${equipmentId} AND tenant_id = ${tenantId} AND is_active = TRUE LIMIT 1`);
    const equipment = equipmentRows[0];
    if (!equipment) return res.status(404).json({ success: false, error: { code: 'EQUIPMENT_NOT_FOUND', message: 'Equipment tidak ditemukan' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.maintenance_requests
        (tenant_id, outlet_id, equipment_id, request_type, priority, title, description, status, scheduled_at, assigned_user_id, created_by)
      VALUES
        (${tenantId}, ${equipment.outlet_id}, ${equipmentId}, ${req.body.requestType || 'corrective'}, ${req.body.priority || 'normal'}, ${title}, ${req.body.description || null}, 'open', ${req.body.scheduledAt ? new Date(req.body.scheduledAt) : null}, ${req.body.assignedUserId ? Number(req.body.assignedUserId) : null}, ${req.userId || null})
      RETURNING *
    `);
    if ((req.body.priority || 'normal') === 'critical') {
      await prisma.$executeRaw(Prisma.sql`UPDATE public.maintenance_equipment SET status = 'down', updated_at = NOW() WHERE id = ${equipmentId} AND tenant_id = ${tenantId}`);
    }
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateMaintenanceRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = Number(req.params.id);
    const status = String(req.body.status || '');
    if (!['planned', 'in_progress', 'done', 'cancelled'].includes(status)) return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status maintenance tidak valid' } });
    const current = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.maintenance_requests WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`);
    if (!current[0]) return res.status(404).json({ success: false, error: { code: 'REQUEST_NOT_FOUND', message: 'Maintenance request tidak ditemukan' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.maintenance_requests
      SET status = ${status},
          scheduled_at = COALESCE(${req.body.scheduledAt ? new Date(req.body.scheduledAt) : null}, scheduled_at),
          assigned_user_id = COALESCE(${req.body.assignedUserId ? Number(req.body.assignedUserId) : null}, assigned_user_id),
          completed_at = CASE WHEN ${status} = 'done' THEN NOW() ELSE completed_at END,
          updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);
    if (status === 'in_progress') {
      await prisma.$executeRaw(Prisma.sql`UPDATE public.maintenance_equipment SET status = 'maintenance', updated_at = NOW() WHERE id = ${Number(current[0].equipment_id)} AND tenant_id = ${tenantId}`);
    } else if (status === 'done' || status === 'cancelled') {
      await prisma.$executeRaw(Prisma.sql`UPDATE public.maintenance_equipment SET status = 'operational', updated_at = NOW() WHERE id = ${Number(current[0].equipment_id)} AND tenant_id = ${tenantId} AND status <> 'retired'`);
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
