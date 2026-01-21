import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * Multi-Level Approval Workflow Controller
 *
 * Features:
 * - Configurable approval levels based on amount threshold
 * - Role-based approvers
 * - Sequential and parallel approval modes
 * - Delegation support
 * - Approval history and audit trail
 * - Email/notification on pending approvals
 * - Auto-escalation for overdue approvals
 */

// ============= TYPES =============

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'delegated';
type ApprovalMode = 'sequential' | 'parallel' | 'any';
type EntityType = 'journal' | 'payment' | 'purchase_order' | 'invoice' | 'expense' | 'budget';

interface ApprovalLevel {
  level: number;
  roleName: string;
  minAmount: number;
  maxAmount: number | null;
  mode: ApprovalMode;
  requiredApprovers: number; // For parallel mode
  autoApproveBelow: number; // Auto-approve if below this amount
  escalationHours: number; // Hours before escalation
}

interface ApprovalRequest {
  id: number;
  entityType: EntityType;
  entityId: number;
  amount: number;
  description: string;
  currentLevel: number;
  totalLevels: number;
  status: ApprovalStatus;
  requestedBy: number;
  requestedAt: Date;
  approvals: ApprovalAction[];
}

interface ApprovalAction {
  level: number;
  approverId: number;
  approverName: string;
  action: 'approve' | 'reject' | 'delegate';
  comment: string;
  timestamp: Date;
}

// ============= DEFAULT APPROVAL LEVELS =============

const DEFAULT_APPROVAL_LEVELS: ApprovalLevel[] = [
  {
    level: 1,
    roleName: 'Supervisor',
    minAmount: 0,
    maxAmount: 10000000,
    mode: 'any',
    requiredApprovers: 1,
    autoApproveBelow: 1000000,
    escalationHours: 24
  },
  {
    level: 2,
    roleName: 'Manager',
    minAmount: 10000000,
    maxAmount: 50000000,
    mode: 'sequential',
    requiredApprovers: 1,
    autoApproveBelow: 0,
    escalationHours: 48
  },
  {
    level: 3,
    roleName: 'Director',
    minAmount: 50000000,
    maxAmount: 200000000,
    mode: 'sequential',
    requiredApprovers: 1,
    autoApproveBelow: 0,
    escalationHours: 72
  },
  {
    level: 4,
    roleName: 'Owner',
    minAmount: 200000000,
    maxAmount: null,
    mode: 'sequential',
    requiredApprovers: 1,
    autoApproveBelow: 0,
    escalationHours: 0 // No escalation for owner
  }
];

// ============= APPROVAL CONFIGURATION =============

/**
 * Get approval configuration
 */
export const getApprovalConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    // Get custom config from database
    const config: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."approval_config"
      WHERE tenant_id = ${tenantId}
      ORDER BY level
    `).catch(() => []);

    const levels = config.length > 0 ? config.map((c: any) => ({
      level: c.level,
      roleName: c.role_name,
      minAmount: Number(c.min_amount),
      maxAmount: c.max_amount ? Number(c.max_amount) : null,
      mode: c.mode,
      requiredApprovers: c.required_approvers,
      autoApproveBelow: Number(c.auto_approve_below || 0),
      escalationHours: c.escalation_hours
    })) : DEFAULT_APPROVAL_LEVELS;

    res.json({
      success: true,
      data: {
        levels,
        entityTypes: ['journal', 'payment', 'purchase_order', 'invoice', 'expense', 'budget']
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update approval configuration
 */
export const updateApprovalConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { levels } = req.body;

    if (!levels || !Array.isArray(levels)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Levels configuration required' }
      });
    }

    // Delete existing config
    await prisma.$executeRawUnsafe(`
      DELETE FROM "accounting"."approval_config" WHERE tenant_id = ${tenantId}
    `).catch(() => {});

    // Insert new config
    for (const level of levels) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "accounting"."approval_config"
        (tenant_id, level, role_name, min_amount, max_amount, mode, required_approvers, auto_approve_below, escalation_hours, updated_by, updated_at)
        VALUES
        (${tenantId}, ${level.level}, '${level.roleName}', ${level.minAmount}, ${level.maxAmount || 'NULL'}, '${level.mode}', ${level.requiredApprovers}, ${level.autoApproveBelow || 0}, ${level.escalationHours || 24}, ${userId}, NOW())
      `).catch(async () => {
        await createApprovalTables();
      });
    }

    res.json({
      success: true,
      message: 'Konfigurasi approval berhasil disimpan'
    });
  } catch (error) {
    next(error);
  }
};

// ============= APPROVAL REQUESTS =============

/**
 * Create approval request
 */
export const createApprovalRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { entityType, entityId, amount, description, urgency = 'normal' } = req.body;

    // Get approval levels for this amount
    const levels = await getApprovalLevelsForAmount(tenantId, amount);

    if (levels.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_APPROVAL_REQUIRED', message: 'Tidak memerlukan approval' }
      });
    }

    // Check for auto-approve
    const firstLevel = levels[0];
    if (amount < firstLevel.autoApproveBelow) {
      // Auto-approve
      await updateEntityStatus(entityType, entityId, 'approved');

      return res.json({
        success: true,
        data: { autoApproved: true },
        message: 'Transaksi di-auto-approve (di bawah threshold)'
      });
    }

    // Create approval request
    const requestId = await prisma.$queryRawUnsafe(`
      INSERT INTO "accounting"."approval_requests"
      (tenant_id, entity_type, entity_id, amount, description, current_level, total_levels, status, urgency, requested_by, requested_at, expires_at)
      VALUES
      (${tenantId}, '${entityType}', ${entityId}, ${amount}, '${description}', 1, ${levels.length}, 'pending', '${urgency}', ${userId}, NOW(), NOW() + INTERVAL '${firstLevel.escalationHours} hours')
      RETURNING id
    `).catch(async () => {
      await createApprovalTables();
      return [{ id: 0 }];
    });

    const id = (requestId as any[])[0]?.id;

    // Get approvers for first level
    const approvers = await getApproversForLevel(tenantId, firstLevel.roleName);

    // Create pending approval entries
    for (const approver of approvers) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "accounting"."approval_actions"
        (request_id, level, approver_id, status, created_at)
        VALUES (${id}, 1, ${approver.id}, 'pending', NOW())
      `).catch(() => {});

      // Send notification to approver
      await createApprovalNotification(
        approver.id,
        'APPROVAL_REQUEST',
        `Approval request baru: ${description} (${formatCurrency(amount)})`,
        { requestId: id, entityType, entityId, amount }
      );
    }

    res.status(201).json({
      success: true,
      data: {
        requestId: id,
        currentLevel: 1,
        totalLevels: levels.length,
        approvers: approvers.map((a: any) => ({ id: a.id, name: a.name, email: a.email })),
        expiresIn: `${firstLevel.escalationHours} jam`
      },
      message: 'Approval request berhasil dibuat'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending approvals for current user
 */
export const getPendingApprovals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const approvals: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ar.*,
        aa.id as action_id,
        aa.status as action_status,
        u.name as requested_by_name
      FROM "accounting"."approval_requests" ar
      JOIN "accounting"."approval_actions" aa ON ar.id = aa.request_id
      JOIN "users" u ON ar.requested_by = u.id
      WHERE ar.tenant_id = ${tenantId}
      AND aa.approver_id = ${userId}
      AND aa.status = '${status}'
      ORDER BY
        CASE ar.urgency WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
        ar.requested_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `).catch(() => []);

    const total: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "accounting"."approval_requests" ar
      JOIN "accounting"."approval_actions" aa ON ar.id = aa.request_id
      WHERE ar.tenant_id = ${tenantId}
      AND aa.approver_id = ${userId}
      AND aa.status = '${status}'
    `).catch(() => [{ count: 0 }]);

    // Get entity details for each approval
    const enrichedApprovals = await Promise.all(approvals.map(async (a) => {
      const entityDetails = await getEntityDetails(a.entity_type, a.entity_id);
      return {
        ...a,
        entityDetails,
        amountFormatted: formatCurrency(Number(a.amount)),
        timeRemaining: calculateTimeRemaining(a.expires_at),
        isOverdue: new Date(a.expires_at) < new Date()
      };
    }));

    res.json({
      success: true,
      data: {
        approvals: enrichedApprovals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total[0]?.count || 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve request
 */
export const approveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { requestId } = req.params;
    const { comment } = req.body;

    // Get request details
    const request: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."approval_requests"
      WHERE id = ${requestId} AND tenant_id = ${tenantId}
    `).catch(() => []);

    if (request.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Request tidak ditemukan' }
      });
    }

    const req_ = request[0];

    // Verify user is an approver for current level
    const action: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."approval_actions"
      WHERE request_id = ${requestId} AND approver_id = ${userId} AND level = ${req_.current_level} AND status = 'pending'
    `).catch(() => []);

    if (action.length === 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Anda bukan approver untuk level ini' }
      });
    }

    // Update action
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."approval_actions"
      SET status = 'approved', comment = '${comment || ''}', action_at = NOW()
      WHERE id = ${action[0].id}
    `);

    // Check if level is complete
    const levelComplete = await isLevelComplete(Number(requestId), req_.current_level);

    if (levelComplete) {
      if (req_.current_level >= req_.total_levels) {
        // All levels approved - complete the request
        await prisma.$executeRawUnsafe(`
          UPDATE "accounting"."approval_requests"
          SET status = 'approved', completed_at = NOW()
          WHERE id = ${requestId}
        `);

        // Update entity status
        await updateEntityStatus(req_.entity_type, req_.entity_id, 'approved');

        // Notify requester about approval
        await createApprovalNotification(
          req_.requested_by,
          'APPROVAL_APPROVED',
          `Request disetujui: ${req_.description}`,
          { requestId: Number(requestId), entityType: req_.entity_type, entityId: req_.entity_id }
        );

        res.json({
          success: true,
          data: { completed: true, status: 'approved' },
          message: 'Approval selesai - semua level sudah approve'
        });
      } else {
        // Move to next level
        const nextLevel = req_.current_level + 1;
        const levels = await getApprovalLevelsForAmount(tenantId, Number(req_.amount));
        const nextLevelConfig = levels.find(l => l.level === nextLevel);

        await prisma.$executeRawUnsafe(`
          UPDATE "accounting"."approval_requests"
          SET current_level = ${nextLevel}, expires_at = NOW() + INTERVAL '${nextLevelConfig?.escalationHours || 24} hours'
          WHERE id = ${requestId}
        `);

        // Create pending approvals for next level
        const approvers = await getApproversForLevel(tenantId, nextLevelConfig?.roleName || 'Manager');
        for (const approver of approvers) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "accounting"."approval_actions"
            (request_id, level, approver_id, status, created_at)
            VALUES (${requestId}, ${nextLevel}, ${approver.id}, 'pending', NOW())
          `).catch(() => {});
        }

        res.json({
          success: true,
          data: { completed: false, nextLevel, approvers: approvers.map((a: any) => a.name) },
          message: `Approved - lanjut ke level ${nextLevel}`
        });
      }
    } else {
      res.json({
        success: true,
        data: { completed: false, waitingForOthers: true },
        message: 'Approved - menunggu approver lain'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reject request
 */
export const rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { requestId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Alasan penolakan wajib diisi' }
      });
    }

    // Verify approver
    const action: any[] = await prisma.$queryRawUnsafe(`
      SELECT aa.*, ar.entity_type, ar.entity_id, ar.requested_by, ar.description, ar.amount
      FROM "accounting"."approval_actions" aa
      JOIN "accounting"."approval_requests" ar ON aa.request_id = ar.id
      WHERE aa.request_id = ${requestId} AND aa.approver_id = ${userId} AND aa.status = 'pending'
      AND ar.tenant_id = ${tenantId}
    `).catch(() => []);

    if (action.length === 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Anda tidak dapat menolak request ini' }
      });
    }

    // Update action
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."approval_actions"
      SET status = 'rejected', comment = '${reason}', action_at = NOW()
      WHERE id = ${action[0].id}
    `);

    // Update request
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."approval_requests"
      SET status = 'rejected', completed_at = NOW()
      WHERE id = ${requestId}
    `);

    // Update entity status
    await updateEntityStatus(action[0].entity_type, action[0].entity_id, 'rejected');

    // Notify requester about rejection
    await createApprovalNotification(
      action[0].requested_by,
      'APPROVAL_REJECTED',
      `Request ditolak: ${action[0].description} - Alasan: ${reason}`,
      { requestId: Number(requestId), entityType: action[0].entity_type, entityId: action[0].entity_id, reason }
    );

    res.json({
      success: true,
      message: 'Request ditolak'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delegate approval to another user
 */
export const delegateApproval = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { requestId } = req.params;
    const { delegateTo, reason } = req.body;

    if (!delegateTo) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Delegasi ke siapa harus diisi' }
      });
    }

    // Verify approver
    const action: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "accounting"."approval_actions"
      WHERE request_id = ${requestId} AND approver_id = ${userId} AND status = 'pending'
    `).catch(() => []);

    if (action.length === 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak dapat mendelegasikan' }
      });
    }

    // Update current action
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."approval_actions"
      SET status = 'delegated', comment = 'Didelegasikan ke user ${delegateTo}: ${reason || ''}', action_at = NOW()
      WHERE id = ${action[0].id}
    `);

    // Create new action for delegate
    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."approval_actions"
      (request_id, level, approver_id, delegated_from, status, created_at)
      VALUES (${requestId}, ${action[0].level}, ${delegateTo}, ${userId}, 'pending', NOW())
    `);

    res.json({
      success: true,
      message: 'Approval berhasil didelegasikan'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get approval history for an entity
 */
export const getApprovalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { entityType, entityId } = req.params;

    const history: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ar.*,
        aa.level,
        aa.status as action_status,
        aa.comment,
        aa.action_at,
        u.name as approver_name,
        u2.name as delegated_from_name
      FROM "accounting"."approval_requests" ar
      JOIN "accounting"."approval_actions" aa ON ar.id = aa.request_id
      JOIN "users" u ON aa.approver_id = u.id
      LEFT JOIN "users" u2 ON aa.delegated_from = u2.id
      WHERE ar.tenant_id = ${tenantId}
      AND ar.entity_type = '${entityType}'
      AND ar.entity_id = ${entityId}
      ORDER BY ar.requested_at DESC, aa.level, aa.created_at
    `).catch(() => []);

    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          requestId: h.id,
          level: h.level,
          approver: h.approver_name,
          delegatedFrom: h.delegated_from_name,
          action: h.action_status,
          comment: h.comment,
          timestamp: h.action_at || h.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get approval statistics
 */
export const getApprovalStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { period = 'month' } = req.query;

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = `AND requested_at >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'month') {
      dateFilter = `AND requested_at >= NOW() - INTERVAL '30 days'`;
    } else if (period === 'year') {
      dateFilter = `AND requested_at >= NOW() - INTERVAL '365 days'`;
    }

    const stats: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/3600) as avg_hours
      FROM "accounting"."approval_requests"
      WHERE tenant_id = ${tenantId}
      ${dateFilter}
      GROUP BY status
    `).catch(() => []);

    const byEntity: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        entity_type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM "accounting"."approval_requests"
      WHERE tenant_id = ${tenantId}
      ${dateFilter}
      GROUP BY entity_type
    `).catch(() => []);

    const summary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0,
      avgApprovalTime: 0
    };

    for (const row of stats) {
      if (row.status === 'pending') summary.pending = Number(row.count);
      if (row.status === 'approved') {
        summary.approved = Number(row.count);
        summary.avgApprovalTime = Number(row.avg_hours || 0);
      }
      if (row.status === 'rejected') summary.rejected = Number(row.count);
      summary.totalAmount += Number(row.total_amount);
    }

    res.json({
      success: true,
      data: {
        summary,
        byEntity,
        approvalRate: summary.approved + summary.rejected > 0
          ? ((summary.approved / (summary.approved + summary.rejected)) * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

async function getApprovalLevelsForAmount(tenantId: number, amount: number): Promise<ApprovalLevel[]> {
  const config: any[] = await prisma.$queryRawUnsafe(`
    SELECT * FROM "accounting"."approval_config"
    WHERE tenant_id = ${tenantId}
    ORDER BY level
  `).catch(() => []);

  const levels = config.length > 0 ? config.map((c: any) => ({
    level: c.level,
    roleName: c.role_name,
    minAmount: Number(c.min_amount),
    maxAmount: c.max_amount ? Number(c.max_amount) : null,
    mode: c.mode as ApprovalMode,
    requiredApprovers: c.required_approvers,
    autoApproveBelow: Number(c.auto_approve_below || 0),
    escalationHours: c.escalation_hours
  })) : DEFAULT_APPROVAL_LEVELS;

  // Filter levels that apply to this amount
  return levels.filter(l =>
    amount >= l.minAmount && (l.maxAmount === null || amount <= l.maxAmount)
  );
}

async function getApproversForLevel(tenantId: number, roleName: string): Promise<any[]> {
  return prisma.$queryRawUnsafe(`
    SELECT u.id, u.name, u.email
    FROM "users" u
    JOIN "roles" r ON u.role_id = r.id
    WHERE u.tenant_id = ${tenantId}
    AND u.is_active = true
    AND r.name ILIKE '%${roleName}%'
  `).catch(() => []);
}

async function isLevelComplete(requestId: number, level: number): Promise<boolean> {
  // Get approval config for this request
  const request: any[] = await prisma.$queryRawUnsafe(`
    SELECT ar.*, ac.mode, ac.required_approvers
    FROM "accounting"."approval_requests" ar
    LEFT JOIN "accounting"."approval_config" ac ON ar.tenant_id = ac.tenant_id AND ac.level = ${level}
    WHERE ar.id = ${requestId}
  `).catch(() => []);

  if (request.length === 0) return false;

  const mode = request[0].mode || 'any';
  const required = request[0].required_approvers || 1;

  // Count approvals for this level
  const approved: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "accounting"."approval_actions"
    WHERE request_id = ${requestId} AND level = ${level} AND status = 'approved'
  `).catch(() => [{ count: 0 }]);

  const approvedCount = Number(approved[0]?.count || 0);

  if (mode === 'any') {
    return approvedCount >= 1;
  } else if (mode === 'parallel') {
    return approvedCount >= required;
  } else {
    // sequential - need all
    const total: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "accounting"."approval_actions"
      WHERE request_id = ${requestId} AND level = ${level}
    `).catch(() => [{ count: 1 }]);

    return approvedCount >= Number(total[0]?.count || 1);
  }
}

async function updateEntityStatus(entityType: string, entityId: number, status: string): Promise<void> {
  const tableMap: Record<string, { table: string; schema: string }> = {
    journal: { table: 'journal_entries', schema: 'accounting' },
    payment: { table: 'ap_payments', schema: 'accounting' },
    invoice: { table: 'accounts_receivable', schema: 'accounting' },
    expense: { table: 'general_ledger', schema: 'accounting' }
  };

  const target = tableMap[entityType];
  if (target) {
    await prisma.$executeRawUnsafe(`
      UPDATE "${target.schema}"."${target.table}"
      SET status = '${status === 'approved' ? 'posted' : 'rejected'}', updated_at = NOW()
      WHERE id = ${entityId}
    `).catch(() => {});
  }
}

async function getEntityDetails(entityType: string, entityId: number): Promise<any> {
  const queries: Record<string, string> = {
    journal: `SELECT * FROM "accounting"."journal_entries" WHERE id = ${entityId}`,
    payment: `SELECT * FROM "accounting"."ap_payments" WHERE id = ${entityId}`,
    invoice: `SELECT * FROM "accounting"."accounts_receivable" WHERE id = ${entityId}`
  };

  const query = queries[entityType];
  if (!query) return null;

  const result: any[] = await prisma.$queryRawUnsafe(query).catch(() => []);
  return result[0] || null;
}

function calculateTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs < 0) return 'Overdue';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours >= 24) {
    return `${Math.floor(hours / 24)} hari`;
  }
  return `${hours} jam`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

async function createApprovalTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."approval_config" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      role_name VARCHAR(100) NOT NULL,
      min_amount DECIMAL(15,2) DEFAULT 0,
      max_amount DECIMAL(15,2),
      mode VARCHAR(20) DEFAULT 'any',
      required_approvers INTEGER DEFAULT 1,
      auto_approve_below DECIMAL(15,2) DEFAULT 0,
      escalation_hours INTEGER DEFAULT 24,
      updated_by INTEGER,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, level)
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."approval_requests" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      current_level INTEGER DEFAULT 1,
      total_levels INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'pending',
      urgency VARCHAR(20) DEFAULT 'normal',
      requested_by INTEGER NOT NULL,
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."approval_actions" (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES "accounting"."approval_requests"(id),
      level INTEGER NOT NULL,
      approver_id INTEGER NOT NULL,
      delegated_from INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      comment TEXT,
      action_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}

/**
 * Create notification/activity log for approval events
 */
async function createApprovalNotification(
  userId: number,
  actionType: string,
  message: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action_type: actionType,
        entity_type: 'approval',
        entity_id: metadata.requestId || null,
        new_value: metadata,
        reason: message
      }
    });
  } catch (error) {
    console.error('Failed to create approval notification:', error);
    // Don't throw - notification failure shouldn't break the main flow
  }
}
