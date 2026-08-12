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
    const criteria = JSON.stringify(req.body.criteria || {});
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.quality_checks
        (tenant_id, outlet_id, check_type, reference_type, reference_id, inventory_id, item_id, status, criteria, notes, created_by)
      VALUES
        (${tenantId}, ${outletId}, ${checkType}, ${req.body.referenceType || null}, ${req.body.referenceId ? String(req.body.referenceId) : null}, ${req.body.inventoryId ? Number(req.body.inventoryId) : null}, ${req.body.itemId ? Number(req.body.itemId) : null}, 'pending', CAST(${criteria} AS jsonb), ${req.body.notes || null}, ${req.userId || null})
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
    if (!['pass', 'fail', 'waived'].includes(status)) return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status QC harus pass/fail/waived' } });
    const measurements = JSON.stringify(req.body.measurements || {});
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.quality_checks
      SET status = ${status}, measurements = CAST(${measurements} AS jsonb), notes = COALESCE(${req.body.notes || null}, notes), checked_by = ${req.userId || null}, checked_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
      RETURNING *
    `);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'QC_NOT_FOUND_OR_CLOSED', message: 'QC tidak ditemukan atau sudah selesai' } });
    res.json({ success: true, data: rows[0] });
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
