import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  buildIntelligenceSnapshot,
  type IntelligenceObservedData,
} from '../services/intelligenceEngine.p4';

interface AgentActionRow {
  id: bigint | number;
  tenant_id: number;
  finding_id: bigint | number | null;
  action_type: string;
  payload: Record<string, unknown>;
  status: string;
  idempotency_key: string;
  requested_by: number;
  result: Record<string, unknown> | null;
  [key: string]: unknown;
}

interface InventoryEvidenceRow {
  inventory_id: number;
  outlet_id: number;
  outlet_name: string;
  inventory_name: string;
  unit: string;
  current_stock: Prisma.Decimal | number | string;
  min_stock: Prisma.Decimal | number | string;
  avg_daily_usage: Prisma.Decimal | number | string;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_active: boolean | null;
  cost_amount: Prisma.Decimal | number | string;
}

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw domainError('Tenant context is required', 'TENANT_REQUIRED');
  return req.tenantId;
};

const requireActor = (req: Request) => {
  if (!req.userId) throw domainError('Authenticated user is required', 'ACTOR_REQUIRED', 401);
  return req.userId;
};

const number = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

const asObject = (value: unknown, code: string) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw domainError('Expected a JSON object', code);
  return value as Record<string, unknown>;
};

const appendActionEvent = async (
  tx: Prisma.TransactionClient,
  input: {
    tenantId: number;
    actionId: string | number | bigint;
    eventType: string;
    actorUserId: number;
    payload?: Record<string, unknown>;
  },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.agent_action_events
      (tenant_id,action_id,event_type,actor_user_id,payload)
    VALUES
      (${input.tenantId},${Number(input.actionId)},${input.eventType},${input.actorUserId},CAST(${JSON.stringify(input.payload || {})} AS jsonb))
  `);
};

const getObservedData = async (tenantId: number): Promise<IntelligenceObservedData> => {
  const [salesRows, cashflowRows, marginRows, stockRows] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        COALESCE(SUM(t.total) FILTER (
          WHERE COALESCE(t.completed_at,t.created_at) >= NOW() - INTERVAL '30 days'
        ),0)::float8 AS last_30_days,
        COALESCE(SUM(t.total) FILTER (
          WHERE COALESCE(t.completed_at,t.created_at) >= NOW() - INTERVAL '60 days'
            AND COALESCE(t.completed_at,t.created_at) < NOW() - INTERVAL '30 days'
        ),0)::float8 AS previous_30_days,
        COUNT(*) FILTER (
          WHERE COALESCE(t.completed_at,t.created_at) >= NOW() - INTERVAL '30 days'
        )::int AS completed_transactions
      FROM public.transactions t
      JOIN public.outlets o ON o.id=t.outlet_id
      WHERE o.tenant_id=${tenantId} AND t.status='completed'
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        COALESCE((SELECT SUM(ar.balance) FROM accounting.accounts_receivable ar
          WHERE ar.tenant_id=${tenantId} AND ar.balance > 0
            AND ar.status NOT IN ('paid','cancelled')
            AND ar.due_date <= CURRENT_DATE + 30),0)::float8 AS receivable_due_30,
        COALESCE((SELECT SUM(ap.balance) FROM accounting.accounts_payable ap
          WHERE ap.tenant_id=${tenantId} AND ap.balance > 0
            AND ap.status NOT IN ('paid','cancelled')
            AND ap.due_date <= CURRENT_DATE + 30),0)::float8 AS payable_due_30,
        COALESCE((SELECT SUM(ar.balance) FROM accounting.accounts_receivable ar
          WHERE ar.tenant_id=${tenantId} AND ar.balance > 0
            AND ar.status NOT IN ('paid','cancelled') AND ar.due_date < CURRENT_DATE),0)::float8 AS receivable_overdue,
        COALESCE((SELECT SUM(ap.balance) FROM accounting.accounts_payable ap
          WHERE ap.tenant_id=${tenantId} AND ap.balance > 0
            AND ap.status NOT IN ('paid','cancelled') AND ap.due_date < CURRENT_DATE),0)::float8 AS payable_overdue
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT i.id AS item_id,i.outlet_id,i.name,i.price::float8 AS price,i.cost::float8 AS cost
      FROM public.items i
      JOIN public.outlets o ON o.id=i.outlet_id
      WHERE o.tenant_id=${tenantId} AND i.is_active=TRUE AND i.price IS NOT NULL AND i.cost IS NOT NULL
      ORDER BY i.id LIMIT 2000
    `),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT i.id AS inventory_id,i.outlet_id,o.name AS outlet_name,i.name,i.unit,
        i.current_stock::float8 AS current_stock,COALESCE(i.min_stock,0)::float8 AS min_stock,
        COALESCE(i.avg_daily_usage,0)::float8 AS avg_daily_usage,
        i.supplier_id,s.name AS supplier_name
      FROM public.inventory i
      JOIN public.outlets o ON o.id=i.outlet_id
      LEFT JOIN public.suppliers s ON s.id=i.supplier_id AND s.outlet_id=i.outlet_id AND s.is_active=TRUE
      WHERE o.tenant_id=${tenantId} AND i.is_active=TRUE
      ORDER BY i.id LIMIT 5000
    `),
  ]);

  const sales = salesRows[0] || {};
  const cashflow = cashflowRows[0] || {};
  return {
    sales: {
      last30Days: number(sales.last_30_days),
      previous30Days: number(sales.previous_30_days),
      completedTransactions: number(sales.completed_transactions),
    },
    cashflow: {
      receivableDue30: number(cashflow.receivable_due_30),
      payableDue30: number(cashflow.payable_due_30),
      receivableOverdue: number(cashflow.receivable_overdue),
      payableOverdue: number(cashflow.payable_overdue),
    },
    marginItems: marginRows.map((row) => ({
      itemId: number(row.item_id),
      outletId: number(row.outlet_id),
      name: String(row.name || ''),
      price: number(row.price),
      cost: number(row.cost),
    })),
    stockItems: stockRows.map((row) => ({
      inventoryId: number(row.inventory_id),
      outletId: number(row.outlet_id),
      outletName: String(row.outlet_name || ''),
      name: String(row.name || ''),
      unit: String(row.unit || 'unit'),
      currentStock: number(row.current_stock),
      minStock: number(row.min_stock),
      averageDailyUsage: number(row.avg_daily_usage),
      supplierId: row.supplier_id ? number(row.supplier_id) : null,
      supplierName: row.supplier_name ? String(row.supplier_name) : null,
    })),
  };
};

const getActionRows = (tenantId: number) => prisma.$queryRaw<AgentActionRow[]>(Prisma.sql`
  SELECT a.*,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id',e.id,'eventType',e.event_type,'actorUserId',e.actor_user_id,
        'payload',e.payload,'createdAt',e.created_at
      ) ORDER BY e.id)
      FROM public.agent_action_events e
      WHERE e.tenant_id=a.tenant_id AND e.action_id=a.id
    ),'[]'::json) AS events
  FROM public.agent_action_requests a
  WHERE a.tenant_id=${tenantId}
  ORDER BY a.id DESC LIMIT 100
`);

export const getIntelligenceDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const dataCutoff = new Date().toISOString();
    const observed = await getObservedData(tenantId);
    const snapshot = buildIntelligenceSnapshot(observed, dataCutoff);
    const latestRuns = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT * FROM public.intelligence_runs
      WHERE tenant_id=${tenantId} AND analysis_type='overview'
      ORDER BY id DESC LIMIT 1
    `);
    const latestRun = latestRuns[0] || null;
    const findings = latestRun
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT * FROM public.intelligence_findings
          WHERE tenant_id=${tenantId} AND run_id=${Number(latestRun.id)}
          ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,id
        `)
      : [];
    const actions = await getActionRows(tenantId);
    res.json({ success: true, data: { snapshot, latestRun, findings, actions } });
  } catch (error) {
    next(error);
  }
};

export const runIntelligenceAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const dataCutoff = new Date().toISOString();
    const snapshot = buildIntelligenceSnapshot(await getObservedData(tenantId), dataCutoff);
    const run = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO public.intelligence_runs
          (tenant_id,analysis_type,status,data_cutoff,parameters,evidence_summary,created_by)
        VALUES
          (${tenantId},'overview','completed',${new Date(dataCutoff)},'{}'::jsonb,CAST(${JSON.stringify(snapshot)} AS jsonb),${actorUserId})
        RETURNING *
      `);
      const created = rows[0];
      for (const finding of snapshot.findings) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.intelligence_findings
            (tenant_id,run_id,finding_type,severity,entity_type,entity_id,title,explanation,observed,derived,confidence,recommended_action)
          VALUES
            (${tenantId},${Number(created.id)},${finding.findingType},${finding.severity},${finding.entityType || null},${finding.entityId || null},${finding.title},${finding.explanation},CAST(${JSON.stringify(finding.observed)} AS jsonb),CAST(${JSON.stringify(finding.derived)} AS jsonb),${finding.confidence},CAST(${JSON.stringify(finding.recommendedAction)} AS jsonb))
        `);
      }
      return created;
    });
    res.status(201).json({ success: true, data: { run, snapshot }, message: 'Evidence-backed intelligence run completed' });
  } catch (error) {
    next(error);
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value);

export const askIntelligenceCopilot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const question = String(req.body.question || '').trim();
    if (question.length < 3 || question.length > 500) throw domainError('Question must contain 3 to 500 characters', 'COPILOT_QUESTION_INVALID');
    const dataCutoff = new Date().toISOString();
    const snapshot = buildIntelligenceSnapshot(await getObservedData(tenantId), dataCutoff);
    const normalized = question.toLocaleLowerCase();
    let intent = 'overview';
    let answer = `Observed 30-day completed sales are ${formatCurrency(snapshot.sales.last30Days)}. There are ${snapshot.findings.length} deterministic findings and ${snapshot.demand.replenishment.length} replenishment recommendations.`;
    let evidence: Array<Record<string, unknown>> = [
      { source: 'transactions', metric: 'last30Days', value: snapshot.sales.last30Days },
      { source: 'derived.findings', metric: 'count', value: snapshot.findings.length },
    ];

    if (/cash|arus kas|receivable|payable|piutang|utang/.test(normalized)) {
      intent = 'cashflow';
      answer = `Open receivables due within 30 days are ${formatCurrency(snapshot.cashflow.receivableDue30)}, while open payables are ${formatCurrency(snapshot.cashflow.payableDue30)}. The scheduled net position is ${formatCurrency(snapshot.cashflow.scheduledNet30)}. This is not a bank cash balance.`;
      evidence = [
        { source: 'accounting.accounts_receivable', metric: 'due30', value: snapshot.cashflow.receivableDue30 },
        { source: 'accounting.accounts_payable', metric: 'due30', value: snapshot.cashflow.payableDue30 },
      ];
    } else if (/margin|profit|laba|harga|cost|biaya/.test(normalized)) {
      intent = 'margin';
      const worst = snapshot.margin.leakage[0];
      answer = worst
        ? `${worst.name} has the lowest observed unit margin among flagged items: ${formatCurrency(worst.marginAmount)} (${Number(worst.marginRate) * 100}%). Review the item master price and cost before acting.`
        : 'No active item master currently has an observed unit margin below 10%.';
      evidence = worst ? [{ source: 'items', itemId: worst.itemId, price: worst.price, cost: worst.cost }] : [{ source: 'items', metric: 'leakageCount', value: 0 }];
    } else if (/stock|stok|demand|replenish|restock|persediaan/.test(normalized)) {
      intent = 'replenishment';
      const top = snapshot.demand.replenishment[0];
      answer = top
        ? `Top recommendation: replenish ${top.inventoryName} by ${top.recommendedQuantity} ${top.unit} to reach a ${top.targetStock} ${top.unit} target. Creating an RFQ still requires explicit approval.`
        : 'No active inventory currently has a positive deterministic replenishment gap.';
      evidence = top ? [{ source: top.evidence, ...top }] : [{ source: 'inventory', metric: 'replenishmentCount', value: 0 }];
    } else if (/sales|sale|penjualan|revenue|omzet/.test(normalized)) {
      intent = 'sales';
      answer = `Completed sales are ${formatCurrency(snapshot.sales.last30Days)} for the latest 30 days versus ${formatCurrency(snapshot.sales.previous30Days)} in the preceding window. ${snapshot.sales.changeRate === null ? 'A rate is unavailable because the prior window is zero.' : `The derived change is ${(snapshot.sales.changeRate * 100).toFixed(1)}%.`}`;
      evidence = [
        { source: 'transactions', window: 'last30Days', value: snapshot.sales.last30Days },
        { source: 'transactions', window: 'previous30Days', value: snapshot.sales.previous30Days },
      ];
    }

    const response = {
      mode: 'deterministic_evidence',
      intent,
      answer,
      confidence: 0.95,
      dataCutoff,
      evidence,
      limitations: snapshot.provenance.unavailable,
    };
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO public.intelligence_runs
        (tenant_id,analysis_type,status,data_cutoff,parameters,evidence_summary,created_by)
      VALUES
        (${tenantId},'copilot','completed',${new Date(dataCutoff)},CAST(${JSON.stringify({ question, intent })} AS jsonb),CAST(${JSON.stringify(response)} AS jsonb),${actorUserId})
    `);
    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

const getInventoryEvidence = async (client: Prisma.TransactionClient | typeof prisma, tenantId: number, inventoryId: number) => {
  const rows = await client.$queryRaw<InventoryEvidenceRow[]>(Prisma.sql`
    SELECT i.id AS inventory_id,i.outlet_id,o.name AS outlet_name,i.name AS inventory_name,i.unit,
      i.current_stock,COALESCE(i.min_stock,0) AS min_stock,COALESCE(i.avg_daily_usage,0) AS avg_daily_usage,
      i.supplier_id,s.name AS supplier_name,s.is_active AS supplier_active,COALESCE(i.cost_amount,0) AS cost_amount
    FROM public.inventory i
    JOIN public.outlets o ON o.id=i.outlet_id
    LEFT JOIN public.suppliers s ON s.id=i.supplier_id AND s.outlet_id=i.outlet_id
    WHERE i.id=${inventoryId} AND o.tenant_id=${tenantId} AND i.is_active=TRUE
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) throw domainError('Inventory was not found in this tenant', 'ACTION_INVENTORY_NOT_FOUND', 404);
  const currentStock = number(row.current_stock);
  const minStock = number(row.min_stock);
  const averageDailyUsage = number(row.avg_daily_usage);
  const targetStock = Math.max(minStock, averageDailyUsage * 14);
  const recommendedQuantity = round3(Math.max(0, targetStock - currentStock));
  if (recommendedQuantity <= 0) throw domainError('Inventory no longer has a replenishment gap', 'ACTION_REPLENISHMENT_NOT_REQUIRED', 409);
  if (!row.supplier_id || row.supplier_active !== true) throw domainError('Inventory requires an active linked supplier before an RFQ can be requested', 'ACTION_SUPPLIER_REQUIRED', 409);
  return {
    inventoryId: row.inventory_id,
    outletId: row.outlet_id,
    outletName: row.outlet_name,
    inventoryName: row.inventory_name,
    unit: row.unit,
    currentStock: round3(currentStock),
    minStock: round3(minStock),
    averageDailyUsage: round3(averageDailyUsage),
    targetStock: round3(targetStock),
    recommendedQuantity,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    targetUnitPrice: number(row.cost_amount),
    evidence: 'inventory.current_stock+min_stock+avg_daily_usage',
    dataCutoff: new Date().toISOString(),
  };
};

const normalizeIdempotencyKey = (value: unknown) => {
  const key = String(value || randomUUID()).trim();
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw domainError('Idempotency key is invalid', 'ACTION_IDEMPOTENCY_KEY_INVALID');
  return key;
};

export const requestReplenishmentAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const inventoryId = Number(req.body.inventoryId);
    if (!Number.isInteger(inventoryId) || inventoryId <= 0) throw domainError('Inventory id is invalid', 'ACTION_INVENTORY_ID_INVALID');
    const findingId = req.body.findingId ? Number(req.body.findingId) : null;
    const idempotencyKey = normalizeIdempotencyKey(req.header('Idempotency-Key'));
    const payload = await getInventoryEvidence(prisma, tenantId, inventoryId);

    if (findingId) {
      const findings = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT id,entity_type,entity_id FROM public.intelligence_findings
        WHERE id=${findingId} AND tenant_id=${tenantId} LIMIT 1
      `);
      if (!findings[0] || findings[0].entity_type !== 'inventory' || String(findings[0].entity_id) !== String(inventoryId)) {
        throw domainError('Finding does not match this tenant inventory', 'ACTION_FINDING_INVALID', 400);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
        SELECT * FROM public.agent_action_requests
        WHERE tenant_id=${tenantId} AND idempotency_key=${idempotencyKey} LIMIT 1
      `);
      if (existing[0]) {
        const existingPayload = asObject(existing[0].payload, 'ACTION_PAYLOAD_INVALID');
        if (Number(existingPayload.inventoryId) !== inventoryId) throw domainError('Idempotency key was already used for another action', 'ACTION_IDEMPOTENCY_CONFLICT', 409);
        return { action: existing[0], reused: true };
      }
      const rows = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
        INSERT INTO public.agent_action_requests
          (tenant_id,finding_id,action_type,payload,status,idempotency_key,requested_by)
        VALUES
          (${tenantId},${findingId},'create_replenishment_rfq',CAST(${JSON.stringify(payload)} AS jsonb),'pending_approval',${idempotencyKey},${actorUserId})
        RETURNING *
      `);
      await appendActionEvent(tx, {
        tenantId,
        actionId: rows[0].id,
        eventType: 'action_requested',
        actorUserId,
        payload: { inventoryId, recommendedQuantity: payload.recommendedQuantity, dataCutoff: payload.dataCutoff },
      });
      return { action: rows[0], reused: false };
    });
    res.status(result.reused ? 200 : 201).json({ success: true, data: result, message: result.reused ? 'Existing action request reused' : 'Replenishment RFQ action awaits approval' });
  } catch (error) {
    next(error);
  }
};

const reviewAction = async (req: Request, decision: 'approved' | 'rejected') => {
  const tenantId = requireTenant(req);
  const actorUserId = requireActor(req);
  const actionId = Number(req.params.id);
  const note = String(req.body.note || '').trim();
  if (!Number.isInteger(actionId) || actionId <= 0) throw domainError('Action id is invalid', 'ACTION_ID_INVALID');
  if (note.length < 4 || note.length > 600) throw domainError('Review note must contain 4 to 600 characters', 'ACTION_REVIEW_NOTE_INVALID');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
      SELECT * FROM public.agent_action_requests WHERE id=${actionId} AND tenant_id=${tenantId} FOR UPDATE
    `);
    const action = rows[0];
    if (!action) throw domainError('Action request was not found', 'ACTION_NOT_FOUND', 404);
    const allowed = decision === 'approved' ? ['pending_approval', 'failed'] : ['pending_approval'];
    if (!allowed.includes(action.status)) throw domainError(`Action cannot be ${decision} from ${action.status}`, 'ACTION_REVIEW_STATUS_INVALID', 409);
    const updated = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
      UPDATE public.agent_action_requests SET
        status=${decision},reviewed_by=${actorUserId},review_note=${note},reviewed_at=NOW(),
        last_error=${decision === 'approved' ? null : action.last_error || null},updated_at=NOW()
      WHERE id=${actionId} AND tenant_id=${tenantId} RETURNING *
    `);
    await appendActionEvent(tx, {
      tenantId,
      actionId,
      eventType: `action_${decision}`,
      actorUserId,
      payload: { note },
    });
    return updated[0];
  });
};

export const approveAgentAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const action = await reviewAction(req, 'approved');
    res.json({ success: true, data: action, message: 'Action approved; execution remains explicit' });
  } catch (error) {
    next(error);
  }
};

export const rejectAgentAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const action = await reviewAction(req, 'rejected');
    res.json({ success: true, data: action, message: 'Action rejected' });
  } catch (error) {
    next(error);
  }
};

export const executeAgentAction = async (req: Request, res: Response, next: NextFunction) => {
  const tenantId = requireTenant(req);
  const actorUserId = requireActor(req);
  const actionId = Number(req.params.id);
  if (!Number.isInteger(actionId) || actionId <= 0) return next(domainError('Action id is invalid', 'ACTION_ID_INVALID'));
  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
        SELECT * FROM public.agent_action_requests WHERE id=${actionId} AND tenant_id=${tenantId} FOR UPDATE
      `);
      const action = rows[0];
      if (!action) throw domainError('Action request was not found', 'ACTION_NOT_FOUND', 404);
      if (action.status === 'completed') return { action, reused: true };
      if (action.status !== 'approved') throw domainError('Only an approved action can execute', 'ACTION_NOT_APPROVED', 409);
      const payload = asObject(action.payload, 'ACTION_PAYLOAD_INVALID');
      const inventoryId = Number(payload.inventoryId);
      const current = await getInventoryEvidence(tx, tenantId, inventoryId);
      if (
        current.outletId !== Number(payload.outletId)
        || current.supplierId !== Number(payload.supplierId)
        || Math.abs(current.recommendedQuantity - Number(payload.recommendedQuantity)) > 0.0005
      ) {
        throw domainError('Replenishment evidence changed after approval; request a new action', 'ACTION_STALE_REAPPROVAL_REQUIRED', 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.agent_action_requests SET status='executing',updated_at=NOW()
        WHERE id=${actionId} AND tenant_id=${tenantId}
      `);
      await appendActionEvent(tx, { tenantId, actionId, eventType: 'action_execution_started', actorUserId });

      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.purchase_rfq_number_seq') AS seq`);
      const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(Number(sequence[0].seq)).padStart(6, '0')}`;
      const rfqs = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO public.purchase_rfqs
          (tenant_id,outlet_id,rfq_number,status,notes,created_by)
        VALUES
          (${tenantId},${current.outletId},${rfqNumber},'draft',${`Approved intelligence action #${actionId}; evidence cutoff ${String(payload.dataCutoff || '')}`},${actorUserId})
        RETURNING *
      `);
      const rfq = rfqs[0];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.purchase_rfq_items
          (rfq_id,inventory_id,quantity,unit,target_unit_price,notes)
        VALUES
          (${Number(rfq.id)},${current.inventoryId},${current.recommendedQuantity},${current.unit},${current.targetUnitPrice},${'Approved deterministic replenishment recommendation'})
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.purchase_rfq_suppliers (rfq_id,supplier_id)
        VALUES (${Number(rfq.id)},${current.supplierId})
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.procurement_event_ledger
          (tenant_id,outlet_id,event_type,reference_type,reference_id,payload,created_by)
        VALUES
          (${tenantId},${current.outletId},'rfq_created_by_approved_action','rfq',${String(rfq.id)},CAST(${JSON.stringify({ actionId, rfqNumber, inventoryId: current.inventoryId, quantity: current.recommendedQuantity })} AS jsonb),${actorUserId})
      `);
      const actionResult = { rfqId: rfq.id, rfqNumber, inventoryId: current.inventoryId, quantity: current.recommendedQuantity };
      const completed = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
        UPDATE public.agent_action_requests SET
          status='completed',executed_by=${actorUserId},executed_at=NOW(),result=CAST(${JSON.stringify(actionResult)} AS jsonb),last_error=NULL,updated_at=NOW()
        WHERE id=${actionId} AND tenant_id=${tenantId} RETURNING *
      `);
      await appendActionEvent(tx, {
        tenantId,
        actionId,
        eventType: 'action_completed',
        actorUserId,
        payload: actionResult,
      });
      return { action: completed[0], reused: false };
    });
    res.json({ success: true, data: result, message: result.reused ? 'Completed action result reused' : 'Approved replenishment RFQ created' });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<AgentActionRow[]>(Prisma.sql`
        SELECT * FROM public.agent_action_requests WHERE id=${actionId} AND tenant_id=${tenantId} FOR UPDATE
      `);
      if (rows[0]?.status === 'approved') {
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'Action execution failed';
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.agent_action_requests SET status='failed',last_error=${message},updated_at=NOW()
          WHERE id=${actionId} AND tenant_id=${tenantId}
        `);
        await appendActionEvent(tx, { tenantId, actionId, eventType: 'action_execution_failed', actorUserId, payload: { message } });
      }
    }).catch(() => undefined);
    next(error);
  }
};

export const listAgentActions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actions = await getActionRows(tenantId);
    res.json({ success: true, data: actions });
  } catch (error) {
    next(error);
  }
};
