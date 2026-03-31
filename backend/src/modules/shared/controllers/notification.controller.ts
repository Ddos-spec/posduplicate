import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { getPendingOperationalChangeNotifications } from '../services/changeApproval.service';

const RECENT_ACTIVITY_WINDOW_HOURS = 72;
const IMPORTANT_ACTIVITY_ACTIONS = [
  'UPDATE_TRANSACTION_STATUS',
  'product_create',
  'product_update',
  'product_delete',
  'table_create',
  'table_update',
  'table_delete',
  'category_create',
  'category_update',
  'category_delete',
  'modifier_create',
  'modifier_update',
  'modifier_delete',
  'variant_create',
  'variant_update',
  'variant_delete',
  'ingredient_create',
  'ingredient_update',
  'ingredient_delete',
  'stock_in',
  'stock_out',
  'stock_increase',
  'stock_decrease',
  'stock_movement_delete',
  'expense_create',
  'expense_update',
  'expense_delete',
  'supplier_create',
  'supplier_update',
  'supplier_delete',
  'cart_item_removed',
  'cart_quantity_reduced',
  'cart_cleared',
  'delete_transaction',
  'user_create',
  'user_update',
  'user_delete',
  'user_password_reset',
  'outlet_create',
  'outlet_update',
  'outlet_delete',
];

const toRecord = (value: unknown): Record<string, any> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, any>;
};

const pickStringValue = (value: Record<string, any> | null, keys: string[]) => {
  if (!value) return null;

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

const humanizeFieldName = (value: string) => {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const extractEntityName = (log: any) => {
  const oldValue = toRecord(log.old_value);
  const newValue = toRecord(log.new_value);

  return (
    pickStringValue(newValue, ['entityLabel', 'name', 'itemName', 'category', 'description', 'transactionNumber']) ||
    pickStringValue(oldValue, ['entityLabel', 'name', 'itemName', 'category', 'description', 'transactionNumber']) ||
    (log.entity_id ? `#${log.entity_id}` : null)
  );
};

const summarizeChangedFields = (oldValue: unknown, newValue: unknown) => {
  const oldRecord = toRecord(oldValue);
  const newRecord = toRecord(newValue);

  if (!oldRecord || !newRecord) {
    return [];
  }

  const excludedKeys = new Set(['id', 'created_at', 'updated_at', 'deleted_at']);
  const keys = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));

  return keys
    .filter((key) => !excludedKeys.has(key))
    .filter((key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]))
    .slice(0, 3)
    .map(humanizeFieldName);
};

const buildActivityDetails = (log: any) => {
  if (typeof log.reason === 'string' && log.reason.trim().length > 0) {
    return `Alasan: ${log.reason.trim()}`;
  }

  const changedFields = summarizeChangedFields(log.old_value, log.new_value);
  if (changedFields.length > 0) {
    return `Perubahan: ${changedFields.join(', ')}`;
  }

  return 'Aktivitas berhasil dicatat.';
};

const getActivityRoute = (actionType: string) => {
  if (
    actionType.startsWith('product_') ||
    actionType.startsWith('table_') ||
    actionType.startsWith('category_') ||
    actionType.startsWith('modifier_') ||
    actionType.startsWith('variant_') ||
    actionType.startsWith('ingredient_') ||
    actionType.startsWith('stock_') ||
    actionType.startsWith('supplier_') ||
    actionType.startsWith('cart_')
  ) {
    if (
      actionType.startsWith('table_') ||
      actionType.startsWith('category_') ||
      actionType.startsWith('modifier_') ||
      actionType.startsWith('variant_') ||
      actionType.startsWith('cart_')
    ) {
      return '/cashier';
    }

    return '/owner/inventory';
  }

  if (actionType.startsWith('expense_')) {
    return '/owner/reports?tab=expenses';
  }

  if (actionType === 'delete_transaction') {
    return '/cashier';
  }

  if (actionType.startsWith('user_')) {
    return '/owner/users';
  }

  if (actionType.startsWith('outlet_')) {
    return '/owner/outlets';
  }

  return undefined;
};

const formatActivityNotification = (tenantId: number, log: any) => {
  const actionType = log.action_type;
  const actorName = log.users?.name || 'Seseorang';
  const entityName = extractEntityName(log);
  const details = buildActivityDetails(log);
  const newValue = toRecord(log.new_value);

  if (actionType === 'UPDATE_TRANSACTION_STATUS') {
    const status = typeof newValue?.status === 'string' ? newValue.status.toLowerCase() : 'unknown';

    if (!['cancelled', 'void', 'failed', 'refund'].includes(status)) {
      return null;
    }

    return {
      id: `activity-log-${log.id}`,
      type: 'transaction_alert',
      message: `Status transaksi #${log.entity_id} diubah ke ${status.toUpperCase()} oleh ${actorName}`,
      details,
      tenantId,
      createdAt: log.created_at?.toISOString(),
      entityId: log.entity_id,
      entityType: log.entity_type,
      actionType,
      actorName,
    };
  }

  const inventoryTarget = entityName ? ` ${entityName}` : '';

  const messageMap: Record<string, string> = {
    product_create: `${actorName} menambahkan menu${inventoryTarget}`,
    product_update: `${actorName} mengubah menu${inventoryTarget}`,
    product_delete: `${actorName} menghapus menu${inventoryTarget}`,
    table_create: `${actorName} menambahkan meja${inventoryTarget}`,
    table_update: `${actorName} mengubah meja${inventoryTarget}`,
    table_delete: `${actorName} menghapus meja${inventoryTarget}`,
    category_create: `${actorName} menambahkan kategori${inventoryTarget}`,
    category_update: `${actorName} mengubah kategori${inventoryTarget}`,
    category_delete: `${actorName} menghapus kategori${inventoryTarget}`,
    modifier_create: `${actorName} menambahkan modifier${inventoryTarget}`,
    modifier_update: `${actorName} mengubah modifier${inventoryTarget}`,
    modifier_delete: `${actorName} menghapus modifier${inventoryTarget}`,
    variant_create: `${actorName} menambahkan varian${inventoryTarget}`,
    variant_update: `${actorName} mengubah varian${inventoryTarget}`,
    variant_delete: `${actorName} menghapus varian${inventoryTarget}`,
    ingredient_create: `${actorName} menambahkan bahan baku${inventoryTarget}`,
    ingredient_update: `${actorName} mengubah bahan baku${inventoryTarget}`,
    ingredient_delete: `${actorName} menghapus bahan baku${inventoryTarget}`,
    stock_in: `${actorName} menambah stok${inventoryTarget}`,
    stock_out: `${actorName} mengurangi stok${inventoryTarget}`,
    stock_increase: `${actorName} menaikkan stok item${inventoryTarget}`,
    stock_decrease: `${actorName} menurunkan stok item${inventoryTarget}`,
    stock_movement_delete: `${actorName} menghapus riwayat pergerakan stok${inventoryTarget}`,
    expense_create: `${actorName} membuat expense baru${inventoryTarget}`,
    expense_update: `${actorName} memperbarui expense${inventoryTarget}`,
    expense_delete: `${actorName} menghapus expense${inventoryTarget}`,
    supplier_create: `${actorName} menambahkan supplier${inventoryTarget}`,
    supplier_update: `${actorName} mengubah supplier${inventoryTarget}`,
    supplier_delete: `${actorName} menghapus supplier${inventoryTarget}`,
    cart_item_removed: `${actorName} menghapus item dari keranjang${inventoryTarget}`,
    cart_quantity_reduced: `${actorName} mengurangi qty item di keranjang${inventoryTarget}`,
    cart_cleared: `${actorName} mengosongkan keranjang kasir`,
    delete_transaction: `${actorName} menghapus transaksi${inventoryTarget}`,
    user_create: `${actorName} membuat akun pengguna${inventoryTarget}`,
    user_update: `${actorName} mengubah akun pengguna${inventoryTarget}`,
    user_delete: `${actorName} menonaktifkan atau menghapus pengguna${inventoryTarget}`,
    user_password_reset: `${actorName} mereset password pengguna${inventoryTarget}`,
    outlet_create: `${actorName} menambahkan outlet${inventoryTarget}`,
    outlet_update: `${actorName} mengubah outlet${inventoryTarget}`,
    outlet_delete: `${actorName} menonaktifkan outlet${inventoryTarget}`,
  };

  const message = messageMap[actionType];
  if (!message) {
    return null;
  }

  return {
    id: `activity-log-${log.id}`,
    type: 'activity_alert',
    message,
    details,
    tenantId,
    createdAt: log.created_at?.toISOString(),
    entityId: log.entity_id,
    entityType: log.entity_type,
    actionType,
    actorName,
    route: getActivityRoute(actionType),
  };
};

const formatOperationalChangeNotification = (tenantId: number, request: any) => {
  const actorName = request.requesterName || 'Seseorang';
  const entityLabel = request.entityLabel ? ` ${request.entityLabel}` : '';
  const actionMap: Record<string, string> = {
    product_create: `mengajukan menu baru${entityLabel}`,
    product_update: `mengajukan perubahan menu${entityLabel}`,
    product_delete: `mengajukan hapus menu${entityLabel}`,
    category_create: `mengajukan kategori baru${entityLabel}`,
    category_update: `mengajukan perubahan kategori${entityLabel}`,
    category_delete: `mengajukan hapus kategori${entityLabel}`,
    modifier_create: `mengajukan modifier baru${entityLabel}`,
    modifier_update: `mengajukan perubahan modifier${entityLabel}`,
    modifier_delete: `mengajukan hapus modifier${entityLabel}`,
    table_create: `mengajukan meja baru${entityLabel}`,
    table_update: `mengajukan perubahan meja${entityLabel}`,
    table_delete: `mengajukan hapus meja${entityLabel}`,
    stock_in: `mengajukan penambahan stok${entityLabel}`,
    stock_out: `mengajukan pengurangan stok${entityLabel}`,
    UPDATE_TRANSACTION_STATUS: `mengajukan perubahan status transaksi${entityLabel}`,
  };

  return {
    id: `change-request-${request.id}`,
    type: 'approval_request',
    message: `${actorName} ${actionMap[request.actionType] || 'mengajukan perubahan operasional'}`,
    details: `Alasan: ${request.reason}`,
    tenantId,
    createdAt: request.createdAt,
    entityId: request.id,
    entityType: 'change_request',
    actionType: request.actionType,
    actorName,
    route: '/owner/approvals',
  };
};

export const getAdminNotifications = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringSoonTenants = await prisma.tenants.findMany({
      where: {
        is_active: true,
        subscription_status: 'active',
        subscription_expires_at: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      select: {
        id: true,
        business_name: true,
        subscription_expires_at: true,
      },
    });

    const overdueTenants = await prisma.tenants.findMany({
      where: {
        is_active: true,
        subscription_status: { not: 'active' },
        subscription_expires_at: {
          lt: now,
        },
      },
      select: {
        id: true,
        business_name: true,
        subscription_expires_at: true,
      },
    });

    const notifications = [
      ...expiringSoonTenants.map(tenant => ({
        id: `expiring-${tenant.id}`,
        type: 'expiring',
        message: `Tenant "${tenant.business_name}" subscription is expiring soon.`,
        details: `Expires on ${new Date(tenant.subscription_expires_at!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscription_expires_at?.toISOString(),
      })),
      ...overdueTenants.map(tenant => ({
        id: `overdue-${tenant.id}`,
        type: 'overdue',
        message: `Tenant "${tenant.business_name}" subscription is overdue.`,
        details: `Expired on ${new Date(tenant.subscription_expires_at!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscription_expires_at?.toISOString(),
      })),
    ];

    // Sort notifications by date
    notifications.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    next(error);
  }
};

export const getTenantNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
      return;
    }

    const now = new Date();
    const privilegedRoles = new Set(['Owner', 'Manager', 'Super Admin', 'Admin']);
    const canViewManagementAlerts = privilegedRoles.has(req.userRole || '');

    // Get subscription-related notifications for this tenant
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        business_name: true,
        subscription_expires_at: true,
        subscription_status: true,
        next_billing_date: true,
      },
    });

    // If tenant not found, return empty notifications instead of error
    // This could happen if tenant was deleted but user still has old token
    if (!tenant) {
      res.json({
        success: true,
        data: [],
        count: 0,
      });
      return;
    }

    const notifications = [];

    // Check subscription expiration
    if (tenant.subscription_expires_at) {
      const daysUntilExpiry = Math.ceil(
        (new Date(tenant.subscription_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (tenant.subscription_status === 'active' && daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
        notifications.push({
          id: `subscription-expiring-${tenant.id}`,
          type: 'expiring',
          message: `Your subscription is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.`,
          details: `Current subscription expires on ${new Date(tenant.subscription_expires_at).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.subscription_expires_at?.toISOString(),
        });
      } else if (tenant.subscription_status !== 'active' && new Date(tenant.subscription_expires_at) < now) {
        notifications.push({
          id: `subscription-overdue-${tenant.id}`,
          type: 'overdue',
          message: `Your subscription has expired.`,
          details: `Expired on ${new Date(tenant.subscription_expires_at).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.subscription_expires_at?.toISOString(),
        });
      }
    }

    // Check for next billing date (if within 7 days)
    if (tenant.next_billing_date) {
      const daysUntilBilling = Math.ceil(
        (new Date(tenant.next_billing_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilBilling <= 7 && daysUntilBilling >= 0) {
        notifications.push({
          id: `billing-reminder-${tenant.id}`,
          type: 'billing',
          message: `Next billing is due in ${daysUntilBilling} day${daysUntilBilling !== 1 ? 's' : ''}.`,
          details: `Billing date: ${new Date(tenant.next_billing_date).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.next_billing_date?.toISOString(),
        });
      }
    }

    const recentActivityThreshold = new Date(now.getTime() - RECENT_ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000);

    const tenantOutlets = await prisma.outlets.findMany({
      where: { tenant_id: tenantId },
      select: { id: true }
    });
    const tenantOutletIds = tenantOutlets.map((outlet) => outlet.id);

    // Find users belonging to this tenant to help recover older logs that may not have outlet_id set.
    const tenantUsers = await prisma.users.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true }
    });
    const tenantUserIds = tenantUsers.map(u => u.id);

    const recentActivityConditions: any[] = [];
    if (tenantOutletIds.length > 0) {
      recentActivityConditions.push({ outlet_id: { in: tenantOutletIds } });
    }
    if (tenantUserIds.length > 0) {
      recentActivityConditions.push({ user_id: { in: tenantUserIds } });
    }

    if (recentActivityConditions.length > 0) {
      const recentActivityLogs = await prisma.activity_logs.findMany({
        where: {
          OR: recentActivityConditions,
          action_type: { in: IMPORTANT_ACTIVITY_ACTIONS },
          created_at: { gte: recentActivityThreshold }
        },
        include: {
          users: { select: { name: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 40
      });

      for (const log of recentActivityLogs) {
        const isManagementAlert = log.action_type.startsWith('user_') || log.action_type.startsWith('outlet_');
        if (isManagementAlert && !canViewManagementAlerts) {
          continue;
        }

        const formattedNotification = formatActivityNotification(tenant.id, log);
        if (formattedNotification) {
          notifications.push(formattedNotification);
        }
      }
    }

    if (canViewManagementAlerts) {
      const pendingChangeRequests = await getPendingOperationalChangeNotifications(tenant.id, 15);
      for (const request of pendingChangeRequests) {
        notifications.push(formatOperationalChangeNotification(tenant.id, request));
      }
    }

    // Sort notifications by date
    notifications.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    next(error);
  }
};
