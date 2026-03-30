import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../controllers/activity-log.controller';
import {
  getTenantNotificationPreferences,
  isEmailDeliveryConfigured,
  sendEmail
} from './emailNotification.service';

export type ChangeControlMode = 'direct' | 'approval';
export type OperationalChangeStatus = 'pending' | 'approved' | 'rejected';

export interface OperationalChangeRequestRecord {
  id: number;
  tenantId: number;
  outletId: number | null;
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  entityType: string;
  actionType: string;
  entityId: number | null;
  entityLabel: string | null;
  reason: string;
  payload: Record<string, any>;
  summary: Record<string, any>;
  status: OperationalChangeStatus;
  approvedBy: number | null;
  approvedByName: string | null;
  rejectedBy: number | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  appliedEntityId: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface CreateOperationalChangeRequestInput {
  tenantId: number;
  outletId?: number | null;
  requesterId: number;
  requesterName: string;
  requesterRole: string;
  entityType: string;
  actionType: string;
  entityId?: number | null;
  entityLabel?: string | null;
  reason: string;
  payload: Record<string, any>;
  summary?: Record<string, any> | null;
}

interface ApplyOperationalChangeResult {
  appliedEntityId: number | null;
  entityLabel?: string | null;
  log?: {
    userId: number;
    actionType: string;
    entityType: string;
    entityId: number | null;
    oldValue: any;
    newValue: any;
    reason: string | null;
    outletId: number | null;
  };
}

const PRIVILEGED_ROLES = new Set(['Owner', 'Manager', 'Supervisor', 'Admin', 'Super Admin', 'super_admin']);
const OPERATIONAL_ROLES = new Set(['Cashier', 'Kasir', 'Waiter', 'Kitchen', 'Staff']);

const toRecord = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
};

const normalizeMode = (value: unknown): ChangeControlMode => value === 'approval' ? 'approval' : 'direct';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const mapRequestRow = (row: any): OperationalChangeRequestRecord => ({
  id: Number(row.id),
  tenantId: Number(row.tenant_id),
  outletId: row.outlet_id === null ? null : Number(row.outlet_id),
  requesterId: Number(row.requester_id),
  requesterName: row.requester_name || 'Unknown User',
  requesterRole: row.requester_role || 'Unknown Role',
  entityType: row.entity_type,
  actionType: row.action_type,
  entityId: row.entity_id === null ? null : Number(row.entity_id),
  entityLabel: row.entity_label || null,
  reason: row.reason || '',
  payload: toRecord(row.payload),
  summary: toRecord(row.summary),
  status: (row.status || 'pending') as OperationalChangeStatus,
  approvedBy: row.approved_by === null ? null : Number(row.approved_by),
  approvedByName: row.approved_by_name || null,
  rejectedBy: row.rejected_by === null ? null : Number(row.rejected_by),
  rejectedByName: row.rejected_by_name || null,
  rejectionReason: row.rejection_reason || null,
  appliedEntityId: row.applied_entity_id === null ? null : Number(row.applied_entity_id),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  resolvedAt: row.resolved_at ? (row.resolved_at instanceof Date ? row.resolved_at.toISOString() : String(row.resolved_at)) : null
});

const buildApprovedReason = (reason: string, approverName: string) => `${reason} | Approved by ${approverName}`;

const formatChangeLabel = (request: OperationalChangeRequestRecord) => {
  if (request.entityLabel) {
    return request.entityLabel;
  }

  const summaryName = typeof request.summary.name === 'string' ? request.summary.name : null;
  if (summaryName) {
    return summaryName;
  }

  if (request.entityId) {
    return `${request.entityType} #${request.entityId}`;
  }

  return request.entityType;
};

const formatActionLabel = (actionType: string) => {
  switch (actionType) {
    case 'product_create':
    case 'category_create':
    case 'modifier_create':
    case 'ingredient_create':
    case 'table_create':
    case 'variant_create':
    case 'outlet_create':
    case 'user_create':
      return 'create';
    case 'product_update':
    case 'category_update':
    case 'modifier_update':
    case 'ingredient_update':
    case 'table_update':
    case 'variant_update':
    case 'outlet_update':
    case 'user_update':
    case 'UPDATE_TRANSACTION_STATUS':
      return 'update';
    case 'product_delete':
    case 'category_delete':
    case 'modifier_delete':
    case 'ingredient_delete':
    case 'table_delete':
    case 'variant_delete':
    case 'outlet_delete':
    case 'user_delete':
      return 'delete';
    default:
      return actionType.toLowerCase().replace(/_/g, ' ');
  }
};

const sendApprovalLifecycleEmail = async (
  tenantId: number,
  request: OperationalChangeRequestRecord,
  event: 'requested' | 'approved' | 'rejected',
  meta?: {
    approverName?: string;
    rejectionReason?: string | null;
  }
) => {
  if (!isEmailDeliveryConfigured()) {
    return;
  }

  const tenantNotification = await getTenantNotificationPreferences(tenantId);
  const { notificationEmail, emailNotifications, approvalEmailAlerts } = tenantNotification.preferences;

  if (!notificationEmail || !emailNotifications || !approvalEmailAlerts) {
    return;
  }

  const businessName = tenantNotification.businessName;
  const changeLabel = formatChangeLabel(request);
  const actionLabel = formatActionLabel(request.actionType);
  const safeBusinessName = escapeHtml(businessName);
  const safeChangeLabel = escapeHtml(changeLabel);
  const safeReason = escapeHtml(request.reason);
  const safeRequesterName = escapeHtml(request.requesterName);
  const safeRequesterRole = escapeHtml(request.requesterRole);
  const safeApproverName = escapeHtml(meta?.approverName || '-');
  const safeRejectionReason = escapeHtml(meta?.rejectionReason || '-');

  let subject = '';
  let intro = '';
  let detail = '';

  switch (event) {
    case 'requested':
      subject = `[${businessName}] Approval baru menunggu persetujuan`;
      intro = `${request.requesterName} mengajukan ${actionLabel} untuk ${changeLabel}.`;
      detail = 'Buka menu approval di owner dashboard untuk approve atau reject perubahan ini.';
      break;
    case 'approved':
      subject = `[${businessName}] Perubahan sudah di-approve`;
      intro = `Perubahan ${actionLabel} untuk ${changeLabel} sudah di-approve oleh ${meta?.approverName || 'owner'}.`;
      detail = 'Perubahan sekarang sudah diterapkan ke data operasional toko.';
      break;
    case 'rejected':
      subject = `[${businessName}] Perubahan ditolak`;
      intro = `Perubahan ${actionLabel} untuk ${changeLabel} ditolak oleh ${meta?.approverName || 'owner'}.`;
      detail = meta?.rejectionReason
        ? `Alasan penolakan: ${meta.rejectionReason}`
        : 'Silakan cek detail pengajuan di dashboard untuk melihat alasan penolakan.';
      break;
  }

  await sendEmail({
    to: notificationEmail,
    subject,
    text: [
      `Halo ${businessName},`,
      '',
      intro,
      `Requester: ${request.requesterName} (${request.requesterRole})`,
      `Alasan: ${request.reason}`,
      event !== 'requested' ? `Diproses oleh: ${meta?.approverName || '-'}` : '',
      event === 'rejected' ? `Catatan reject: ${meta?.rejectionReason || '-'}` : '',
      '',
      detail,
      '',
      'Salam,',
      'MyPOS'
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">${safeBusinessName}</h2>
        <p style="margin: 0 0 12px;">${escapeHtml(intro)}</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tbody>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #6b7280;">Perubahan</td>
              <td style="padding: 4px 0;"><strong>${safeChangeLabel}</strong></td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #6b7280;">Requester</td>
              <td style="padding: 4px 0;">${safeRequesterName} (${safeRequesterRole})</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #6b7280;">Alasan</td>
              <td style="padding: 4px 0;">${safeReason}</td>
            </tr>
            ${event !== 'requested' ? `
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #6b7280;">Diproses oleh</td>
                <td style="padding: 4px 0;">${safeApproverName}</td>
              </tr>
            ` : ''}
            ${event === 'rejected' ? `
              <tr>
                <td style="padding: 4px 12px 4px 0; color: #6b7280;">Catatan reject</td>
                <td style="padding: 4px 0;">${safeRejectionReason}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        <p style="margin: 16px 0 0;">${escapeHtml(detail)}</p>
        <p style="margin: 24px 0 0;">Salam,<br />MyPOS</p>
      </div>
    `
  });
};

const buildProductSnapshot = (product: any) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  category_id: product.category_id,
  outlet_id: product.outlet_id,
  is_active: product.is_active,
  track_stock: product.track_stock,
  stock: product.stock
});

const buildCategorySnapshot = (category: any) => ({
  id: category.id,
  name: category.name,
  type: category.type,
  outlet_id: category.outlet_id,
  is_active: category.is_active
});

const buildModifierSnapshot = (modifier: any) => ({
  id: modifier.id,
  name: modifier.name,
  price: modifier.price,
  outlet_id: modifier.outlet_id,
  is_active: modifier.is_active
});

const buildTableSnapshot = (table: any) => ({
  id: table.id,
  name: table.name,
  capacity: table.capacity,
  status: table.status,
  outlet_id: table.outlet_id,
  is_active: table.is_active
});

export const buildIngredientSnapshot = (ingredient: any) => ({
  id: ingredient.id,
  name: ingredient.name,
  unit: ingredient.unit,
  stock: ingredient.stock,
  min_stock: ingredient.min_stock,
  cost_per_unit: ingredient.cost_per_unit,
  outlet_id: ingredient.outlet_id,
  is_active: ingredient.is_active
});

export const isPrivilegedChangeRole = (role?: string | null) => PRIVILEGED_ROLES.has(String(role || ''));

export const canInitiateOperationalChange = (role?: string | null) => {
  const normalizedRole = String(role || '');
  return isPrivilegedChangeRole(normalizedRole) || OPERATIONAL_ROLES.has(normalizedRole);
};

export const ensureOperationalChangeTables = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.operational_change_requests (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      outlet_id INTEGER NULL,
      requester_id INTEGER NOT NULL,
      requester_name VARCHAR(255) NOT NULL,
      requester_role VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      action_type VARCHAR(100) NOT NULL,
      entity_id INTEGER NULL,
      entity_label VARCHAR(255) NULL,
      reason TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      approved_by INTEGER NULL,
      approved_by_name VARCHAR(255) NULL,
      rejected_by INTEGER NULL,
      rejected_by_name VARCHAR(255) NULL,
      rejection_reason TEXT NULL,
      applied_entity_id INTEGER NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_operational_change_requests_tenant_status
    ON public.operational_change_requests (tenant_id, status, created_at DESC);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_operational_change_requests_requester
    ON public.operational_change_requests (requester_id, created_at DESC);
  `);
};

export const getTenantChangeControlMode = async (tenantId?: number | null): Promise<ChangeControlMode> => {
  if (!tenantId) {
    return 'direct';
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { settings: true }
  });

  const settings = toRecord(tenant?.settings);
  const approvalSettings = toRecord(settings.approvalSettings);

  return normalizeMode(approvalSettings.changeControlMode);
};

export const shouldQueueOperationalChange = async (tenantId: number | undefined, userRole?: string | null) => {
  if (!tenantId || isPrivilegedChangeRole(userRole)) {
    return false;
  }

  return (await getTenantChangeControlMode(tenantId)) === 'approval';
};

export const createOperationalChangeRequest = async (input: CreateOperationalChangeRequestInput) => {
  await ensureOperationalChangeTables();

  const payloadJson = JSON.stringify(input.payload || {});
  const summaryJson = JSON.stringify(input.summary || {});

  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO public.operational_change_requests (
      tenant_id,
      outlet_id,
      requester_id,
      requester_name,
      requester_role,
      entity_type,
      action_type,
      entity_id,
      entity_label,
      reason,
      payload,
      summary
    ) VALUES (
      ${input.tenantId},
      ${input.outletId ?? null},
      ${input.requesterId},
      ${input.requesterName},
      ${input.requesterRole},
      ${input.entityType},
      ${input.actionType},
      ${input.entityId ?? null},
      ${input.entityLabel ?? null},
      ${input.reason},
      ${payloadJson}::jsonb,
      ${summaryJson}::jsonb
    )
    RETURNING *
  `;

  const record = mapRequestRow(rows[0]);

  try {
    await createActivityLog(
      input.requesterId,
      'change_request_create',
      'change_request',
      record.id,
      null,
      {
        entityType: input.entityType,
        actionType: input.actionType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        status: 'pending'
      },
      input.reason,
      input.outletId ?? null
    );
  } catch (logError) {
    console.error('Failed to create change request activity log:', logError);
  }

  try {
    await sendApprovalLifecycleEmail(input.tenantId, record, 'requested');
  } catch (emailError) {
    console.error('Failed to send approval request email:', emailError);
  }

  return record;
};

export const listOperationalChangeRequests = async (
  tenantId: number,
  status?: OperationalChangeStatus | 'all',
  limit = 50
) => {
  await ensureOperationalChangeTables();

  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 50;

  const rows = status && status !== 'all'
    ? await prisma.$queryRaw<any[]>`
        SELECT *
        FROM public.operational_change_requests
        WHERE tenant_id = ${tenantId}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT ${boundedLimit}
      `
    : await prisma.$queryRaw<any[]>`
        SELECT *
        FROM public.operational_change_requests
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${boundedLimit}
      `;

  return rows.map(mapRequestRow);
};

export const getOperationalChangeRequestById = async (tenantId: number, requestId: number) => {
  await ensureOperationalChangeTables();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT *
    FROM public.operational_change_requests
    WHERE tenant_id = ${tenantId}
      AND id = ${requestId}
    LIMIT 1
  `;

  return rows[0] ? mapRequestRow(rows[0]) : null;
};

export const getPendingOperationalChangeNotifications = async (tenantId: number, limit = 12) => {
  return listOperationalChangeRequests(tenantId, 'pending', limit);
};

const requireTenantOutlet = async (tx: Prisma.TransactionClient, tenantId: number, outletId: number | null | undefined) => {
  if (!outletId) {
    return null;
  }

  const outlet = await tx.outlets.findFirst({
    where: { id: outletId, tenant_id: tenantId }
  });

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan atau bukan milik tenant ini.');
  }

  return outlet;
};

const applyOperationalChange = async (
  tx: Prisma.TransactionClient,
  request: OperationalChangeRequestRecord,
  approverName: string
): Promise<ApplyOperationalChangeResult> => {
  const payload = toRecord(request.payload);
  const approvedReason = buildApprovedReason(request.reason, approverName);

  switch (request.actionType) {
    case 'product_create': {
      const outletId = Number(payload.outletId ?? payload.outlet_id ?? request.outletId);
      await requireTenantOutlet(tx, request.tenantId, outletId);

      const {
        categoryId,
        outletId: outletIdInput,
        isActive,
        trackStock,
        minStock,
        priceGofood,
        priceGrabfood,
        priceShopeefood,
        reason: _reason,
        ...rest
      } = payload;

      const createData: any = { ...rest };
      if (categoryId !== undefined) createData.category_id = categoryId;
      if (outletIdInput !== undefined) createData.outlet_id = outletIdInput;
      if (isActive !== undefined) createData.is_active = isActive;
      if (trackStock !== undefined) createData.track_stock = trackStock;
      if (minStock !== undefined) createData.min_stock = minStock;
      if (priceGofood !== undefined) createData.price_gofood = priceGofood;
      if (priceGrabfood !== undefined) createData.price_grabfood = priceGrabfood;
      if (priceShopeefood !== undefined) createData.price_shopeefood = priceShopeefood;

      const product = await tx.items.create({ data: createData });

      return {
        appliedEntityId: product.id,
        entityLabel: product.name,
        log: {
          userId: request.requesterId,
          actionType: 'product_create',
          entityType: 'product',
          entityId: product.id,
          oldValue: null,
          newValue: buildProductSnapshot(product),
          reason: approvedReason,
          outletId: product.outlet_id || request.outletId || null
        }
      };
    }
    case 'product_update': {
      const productId = request.entityId || Number(payload.id);
      const existing = await tx.items.findUnique({ where: { id: productId || 0 } });
      if (!existing) {
        throw new Error('Produk tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);

      const {
        categoryId,
        outletId,
        isActive,
        trackStock,
        minStock,
        priceGofood,
        priceGrabfood,
        priceShopeefood,
        reason: _reason,
        ...rest
      } = payload;

      const mappedUpdate: any = { ...rest };
      if (categoryId !== undefined) mappedUpdate.category_id = categoryId;
      if (outletId !== undefined) mappedUpdate.outlet_id = outletId;
      if (isActive !== undefined) mappedUpdate.is_active = isActive;
      if (trackStock !== undefined) mappedUpdate.track_stock = trackStock;
      if (minStock !== undefined) mappedUpdate.min_stock = minStock;
      if (priceGofood !== undefined) mappedUpdate.price_gofood = priceGofood;
      if (priceGrabfood !== undefined) mappedUpdate.price_grabfood = priceGrabfood;
      if (priceShopeefood !== undefined) mappedUpdate.price_shopeefood = priceShopeefood;

      const updated = await tx.items.update({
        where: { id: existing.id },
        data: mappedUpdate
      });

      return {
        appliedEntityId: updated.id,
        entityLabel: updated.name,
        log: {
          userId: request.requesterId,
          actionType: 'product_update',
          entityType: 'product',
          entityId: updated.id,
          oldValue: buildProductSnapshot(existing),
          newValue: buildProductSnapshot(updated),
          reason: approvedReason,
          outletId: updated.outlet_id || existing.outlet_id || request.outletId || null
        }
      };
    }
    case 'product_delete': {
      const productId = request.entityId || Number(payload.id);
      const existing = await tx.items.findUnique({ where: { id: productId || 0 } });
      if (!existing) {
        throw new Error('Produk tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);
      await tx.items.update({
        where: { id: existing.id },
        data: { is_active: false }
      });

      return {
        appliedEntityId: existing.id,
        entityLabel: existing.name,
        log: {
          userId: request.requesterId,
          actionType: 'product_delete',
          entityType: 'product',
          entityId: existing.id,
          oldValue: buildProductSnapshot(existing),
          newValue: null,
          reason: approvedReason,
          outletId: existing.outlet_id || request.outletId || null
        }
      };
    }
    case 'category_create': {
      const outletId = payload.outletId ? Number(payload.outletId) : null;
      if (outletId) {
        await requireTenantOutlet(tx, request.tenantId, outletId);
      }

      const category = await tx.categories.create({
        data: {
          name: payload.name,
          type: payload.type || 'item',
          outlet_id: outletId
        }
      });

      return {
        appliedEntityId: category.id,
        entityLabel: category.name,
        log: {
          userId: request.requesterId,
          actionType: 'category_create',
          entityType: 'category',
          entityId: category.id,
          oldValue: null,
          newValue: buildCategorySnapshot(category),
          reason: approvedReason,
          outletId: category.outlet_id || request.outletId || null
        }
      };
    }
    case 'category_update': {
      const categoryId = request.entityId || Number(payload.id);
      const existing = await tx.categories.findUnique({ where: { id: categoryId || 0 } });
      if (!existing) {
        throw new Error('Kategori tidak ditemukan.');
      }

      if (existing.outlet_id) {
        await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);
      }

      if (payload.outletId !== undefined && payload.outletId !== null) {
        await requireTenantOutlet(tx, request.tenantId, Number(payload.outletId));
      }

      const updated = await tx.categories.update({
        where: { id: existing.id },
        data: {
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.type !== undefined && { type: payload.type }),
          ...(payload.isActive !== undefined && { is_active: payload.isActive }),
          ...(payload.outletId !== undefined && { outlet_id: payload.outletId })
        }
      });

      return {
        appliedEntityId: updated.id,
        entityLabel: updated.name,
        log: {
          userId: request.requesterId,
          actionType: 'category_update',
          entityType: 'category',
          entityId: updated.id,
          oldValue: buildCategorySnapshot(existing),
          newValue: buildCategorySnapshot(updated),
          reason: approvedReason,
          outletId: updated.outlet_id || existing.outlet_id || request.outletId || null
        }
      };
    }
    case 'category_delete': {
      const categoryId = request.entityId || Number(payload.id);
      const existing = await tx.categories.findUnique({ where: { id: categoryId || 0 } });
      if (!existing) {
        throw new Error('Kategori tidak ditemukan.');
      }

      if (existing.outlet_id) {
        await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);
      }

      await tx.categories.update({
        where: { id: existing.id },
        data: { is_active: false }
      });

      return {
        appliedEntityId: existing.id,
        entityLabel: existing.name,
        log: {
          userId: request.requesterId,
          actionType: 'category_delete',
          entityType: 'category',
          entityId: existing.id,
          oldValue: buildCategorySnapshot(existing),
          newValue: null,
          reason: approvedReason,
          outletId: existing.outlet_id || request.outletId || null
        }
      };
    }
    default:
      break;
  }

  switch (request.actionType) {
    case 'modifier_create': {
      const outletId = Number(payload.outletId ?? request.outletId);
      await requireTenantOutlet(tx, request.tenantId, outletId);

      const modifier = await tx.modifiers.create({
        data: {
          name: payload.name,
          price: payload.price || 0,
          outlet_id: outletId,
          is_active: true
        }
      });

      return {
        appliedEntityId: modifier.id,
        entityLabel: modifier.name,
        log: {
          userId: request.requesterId,
          actionType: 'modifier_create',
          entityType: 'modifier',
          entityId: modifier.id,
          oldValue: null,
          newValue: buildModifierSnapshot(modifier),
          reason: approvedReason,
          outletId: modifier.outlet_id || request.outletId || null
        }
      };
    }
    case 'modifier_update': {
      const modifierId = request.entityId || Number(payload.id);
      const existing = await tx.modifiers.findUnique({ where: { id: modifierId || 0 } });
      if (!existing) {
        throw new Error('Modifier tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);

      const updated = await tx.modifiers.update({
        where: { id: existing.id },
        data: {
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.price !== undefined && { price: payload.price }),
          ...(payload.isActive !== undefined && { is_active: payload.isActive })
        }
      });

      return {
        appliedEntityId: updated.id,
        entityLabel: updated.name,
        log: {
          userId: request.requesterId,
          actionType: 'modifier_update',
          entityType: 'modifier',
          entityId: updated.id,
          oldValue: buildModifierSnapshot(existing),
          newValue: buildModifierSnapshot(updated),
          reason: approvedReason,
          outletId: updated.outlet_id || existing.outlet_id || request.outletId || null
        }
      };
    }
    case 'modifier_delete': {
      const modifierId = request.entityId || Number(payload.id);
      const existing = await tx.modifiers.findUnique({ where: { id: modifierId || 0 } });
      if (!existing) {
        throw new Error('Modifier tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);
      await tx.modifiers.update({
        where: { id: existing.id },
        data: { is_active: false }
      });

      return {
        appliedEntityId: existing.id,
        entityLabel: existing.name,
        log: {
          userId: request.requesterId,
          actionType: 'modifier_delete',
          entityType: 'modifier',
          entityId: existing.id,
          oldValue: buildModifierSnapshot(existing),
          newValue: null,
          reason: approvedReason,
          outletId: existing.outlet_id || request.outletId || null
        }
      };
    }
    default:
      break;
  }

  switch (request.actionType) {
    case 'table_create': {
      const outletId = Number(payload.outletId ?? request.outletId);
      await requireTenantOutlet(tx, request.tenantId, outletId);

      const table = await tx.tables.create({
        data: {
          name: payload.name,
          capacity: Number(payload.capacity || 4),
          outlet_id: outletId,
          status: 'available',
          is_active: true
        }
      });

      return {
        appliedEntityId: table.id,
        entityLabel: table.name,
        log: {
          userId: request.requesterId,
          actionType: 'table_create',
          entityType: 'table',
          entityId: table.id,
          oldValue: null,
          newValue: buildTableSnapshot(table),
          reason: approvedReason,
          outletId: table.outlet_id || request.outletId || null
        }
      };
    }
    case 'table_update': {
      const tableId = request.entityId || Number(payload.id);
      const existing = await tx.tables.findUnique({ where: { id: tableId || 0 } });
      if (!existing) {
        throw new Error('Meja tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);

      const updated = await tx.tables.update({
        where: { id: existing.id },
        data: {
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.capacity !== undefined && { capacity: Number(payload.capacity) })
        }
      });

      return {
        appliedEntityId: updated.id,
        entityLabel: updated.name,
        log: {
          userId: request.requesterId,
          actionType: 'table_update',
          entityType: 'table',
          entityId: updated.id,
          oldValue: buildTableSnapshot(existing),
          newValue: buildTableSnapshot(updated),
          reason: approvedReason,
          outletId: updated.outlet_id || existing.outlet_id || request.outletId || null
        }
      };
    }
    case 'table_delete': {
      const tableId = request.entityId || Number(payload.id);
      const existing = await tx.tables.findUnique({ where: { id: tableId || 0 } });
      if (!existing) {
        throw new Error('Meja tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);
      await tx.tables.update({
        where: { id: existing.id },
        data: { is_active: false }
      });

      return {
        appliedEntityId: existing.id,
        entityLabel: existing.name,
        log: {
          userId: request.requesterId,
          actionType: 'table_delete',
          entityType: 'table',
          entityId: existing.id,
          oldValue: buildTableSnapshot(existing),
          newValue: null,
          reason: approvedReason,
          outletId: existing.outlet_id || request.outletId || null
        }
      };
    }
    default:
      break;
  }

  switch (request.actionType) {
    case 'stock_in':
    case 'stock_out': {
      const ingredientId = Number(payload.ingredientId ?? request.entityId);
      const ingredient = await tx.ingredients.findUnique({ where: { id: ingredientId || 0 } });
      if (!ingredient) {
        throw new Error('Bahan baku tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, ingredient.outlet_id);

      const oldStock = Number(ingredient.stock);
      const adjustmentQty = Number(payload.quantity);
      const newStock = request.actionType === 'stock_in' ? oldStock + adjustmentQty : oldStock - adjustmentQty;

      if (newStock < 0) {
        throw new Error('Stok tidak boleh negatif.');
      }

      await tx.ingredients.update({
        where: { id: ingredient.id },
        data: { stock: newStock }
      });

      return {
        appliedEntityId: ingredient.id,
        entityLabel: ingredient.name,
        log: {
          userId: request.requesterId,
          actionType: request.actionType,
          entityType: 'ingredient',
          entityId: ingredient.id,
          oldValue: { stock: oldStock },
          newValue: { stock: newStock },
          reason: approvedReason,
          outletId: ingredient.outlet_id || request.outletId || null
        }
      };
    }
    case 'UPDATE_TRANSACTION_STATUS': {
      const transactionId = request.entityId || Number(payload.id);
      const existing = await tx.transactions.findUnique({
        where: { id: transactionId || 0 },
        include: {
          transaction_items: {
            include: { items: true }
          }
        }
      });

      if (!existing) {
        throw new Error('Transaksi tidak ditemukan.');
      }

      if (!existing.outlet_id) {
        throw new Error('Outlet transaksi tidak ditemukan.');
      }

      await requireTenantOutlet(tx, request.tenantId, existing.outlet_id);

      const nextStatus = String(payload.status || '').trim();
      if (!nextStatus) {
        throw new Error('Status transaksi tujuan wajib diisi.');
      }

      if (nextStatus === 'cancelled' && existing.status === 'completed') {
        for (const transactionItem of existing.transaction_items) {
          const item = transactionItem.items;
          const quantity = Number(transactionItem.quantity);
          if (item.track_stock) {
            await tx.items.update({
              where: { id: item.id },
              data: {
                stock: {
                  increment: quantity
                }
              }
            });
          }
        }
      }

      const timestamp = new Date().toLocaleString('id-ID');
      const noteEntry = `[${timestamp}] Status changed to ${nextStatus}: ${approvedReason}`;
      const updatedNotes = existing.notes ? `${existing.notes}\n${noteEntry}` : noteEntry;

      const updated = await tx.transactions.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          notes: updatedNotes,
          ...(nextStatus === 'completed' && { completed_at: new Date() })
        }
      });

      return {
        appliedEntityId: updated.id,
        entityLabel: existing.transaction_number || `#${updated.id}`,
        log: {
          userId: request.requesterId,
          actionType: 'UPDATE_TRANSACTION_STATUS',
          entityType: 'transactions',
          entityId: updated.id,
          oldValue: { status: existing.status },
          newValue: { status: nextStatus },
          reason: approvedReason,
          outletId: existing.outlet_id || request.outletId || null
        }
      };
    }
    default:
      throw new Error(`Approval action ${request.actionType} belum didukung.`);
  }
};

export const approveOperationalChangeRequest = async (
  tenantId: number,
  requestId: number,
  approverId: number,
  approverName: string
) => {
  await ensureOperationalChangeTables();
  const request = await getOperationalChangeRequestById(tenantId, requestId);

  if (!request) {
    throw new Error('Request approval tidak ditemukan.');
  }

  if (request.status !== 'pending') {
    throw new Error('Request approval ini sudah diproses sebelumnya.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const applied = await applyOperationalChange(tx, request, approverName);

    await tx.$executeRaw`
      UPDATE public.operational_change_requests
      SET status = 'approved',
          approved_by = ${approverId},
          approved_by_name = ${approverName},
          applied_entity_id = ${applied.appliedEntityId},
          updated_at = NOW(),
          resolved_at = NOW()
      WHERE id = ${requestId}
    `;

    return applied;
  });

  if (result.log) {
    try {
      await createActivityLog(
        result.log.userId,
        result.log.actionType,
        result.log.entityType,
        result.log.entityId,
        result.log.oldValue,
        result.log.newValue,
        result.log.reason,
        result.log.outletId
      );
    } catch (logError) {
      console.error('Failed to create approved change activity log:', logError);
    }
  }

  try {
    await createActivityLog(
      approverId,
      'change_request_approved',
      'change_request',
      requestId,
      { status: 'pending' },
      {
        status: 'approved',
        actionType: request.actionType,
        entityType: request.entityType,
        appliedEntityId: result.appliedEntityId
      },
      `Approved request from ${request.requesterName}: ${request.reason}`,
      request.outletId
    );
  } catch (logError) {
    console.error('Failed to create approval resolution activity log:', logError);
  }

  const updatedRequest = await getOperationalChangeRequestById(tenantId, requestId);

  if (updatedRequest) {
    try {
      await sendApprovalLifecycleEmail(tenantId, updatedRequest, 'approved', {
        approverName
      });
    } catch (emailError) {
      console.error('Failed to send approved change email:', emailError);
    }
  }

  return updatedRequest;
};

export const rejectOperationalChangeRequest = async (
  tenantId: number,
  requestId: number,
  approverId: number,
  approverName: string,
  rejectionReason: string
) => {
  await ensureOperationalChangeTables();
  const request = await getOperationalChangeRequestById(tenantId, requestId);

  if (!request) {
    throw new Error('Request approval tidak ditemukan.');
  }

  if (request.status !== 'pending') {
    throw new Error('Request approval ini sudah diproses sebelumnya.');
  }

  await prisma.$executeRaw`
    UPDATE public.operational_change_requests
    SET status = 'rejected',
        rejected_by = ${approverId},
        rejected_by_name = ${approverName},
        rejection_reason = ${rejectionReason},
        updated_at = NOW(),
        resolved_at = NOW()
    WHERE id = ${requestId}
  `;

  try {
    await createActivityLog(
      approverId,
      'change_request_rejected',
      'change_request',
      requestId,
      { status: 'pending' },
      {
        status: 'rejected',
        actionType: request.actionType,
        entityType: request.entityType
      },
      `Rejected request from ${request.requesterName}: ${rejectionReason}`,
      request.outletId
    );
  } catch (logError) {
    console.error('Failed to create rejection activity log:', logError);
  }

  const updatedRequest = await getOperationalChangeRequestById(tenantId, requestId);

  if (updatedRequest) {
    try {
      await sendApprovalLifecycleEmail(tenantId, updatedRequest, 'rejected', {
        approverName,
        rejectionReason
      });
    } catch (emailError) {
      console.error('Failed to send rejected change email:', emailError);
    }
  }

  return updatedRequest;
};
