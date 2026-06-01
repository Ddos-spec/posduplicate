import { randomUUID } from 'crypto';
import prisma from '../../../utils/prisma';

type AdsAgentActionStatus = 'pending' | 'approved' | 'revision_requested' | 'deferred';
type AdsAgentExecutionStatus = 'proposal_only' | 'ready_for_manual_execution' | 'awaiting_platform_executor' | 'deferred' | 'revision_requested';

export interface AdsAgentActionInput {
  title: string;
  detail: string;
  actionType: string;
  platform?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  riskLevel?: 'low' | 'medium' | 'high';
  budgetImpact?: string | null;
  approvalQuestion?: string | null;
}

export interface AdsAgentAction extends AdsAgentActionInput {
  id: string;
  runId: string;
  status: AdsAgentActionStatus;
  executionStatus: AdsAgentExecutionStatus;
  decisionNote?: string | null;
  decidedBy?: number | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface AdsAgentRun {
  id: string;
  brief: string;
  goal: string;
  platform: string;
  agentMode: string;
  budgetGuardrail: string;
  output: string;
  createdBy?: number | null;
  createdAt: string;
  actions: AdsAgentAction[];
}

const INTEGRATION_TYPE = 'mcs_ads_agent_actions';

function normalizeStore(raw: unknown): { runs: AdsAgentRun[] } {
  if (!raw || typeof raw !== 'object') return { runs: [] };
  const runs = Array.isArray((raw as any).runs) ? (raw as any).runs : [];
  return { runs };
}

function flattenActions(store: { runs: AdsAgentRun[] }): AdsAgentAction[] {
  return store.runs.flatMap((run) => Array.isArray(run.actions) ? run.actions : []);
}

async function readStore(tenantId: number): Promise<{ runs: AdsAgentRun[] }> {
  const row = await prisma.integrations.findUnique({
    where: { tenant_id_integration_type: { tenant_id: tenantId, integration_type: INTEGRATION_TYPE } },
  });
  return normalizeStore(row?.metadata);
}

async function writeStore(tenantId: number, store: { runs: AdsAgentRun[] }) {
  await prisma.integrations.upsert({
    where: { tenant_id_integration_type: { tenant_id: tenantId, integration_type: INTEGRATION_TYPE } },
    update: {
      status: 'active',
      is_active: true,
      metadata: store as any,
      last_sync_at: new Date(),
      updated_at: new Date(),
    },
    create: {
      tenant_id: tenantId,
      integration_type: INTEGRATION_TYPE,
      status: 'active',
      is_active: true,
      activated_at: new Date(),
      last_sync_at: new Date(),
      metadata: store as any,
      configuration: {},
      credentials: {},
    },
  });
}

export async function listAdsAgentRuns(tenantId: number) {
  const store = await readStore(tenantId);
  const runs = store.runs
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 25);
  return {
    runs,
    actions: flattenActions({ runs })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 100),
  };
}

export async function createAdsAgentRun(tenantId: number, userId: number | undefined, payload: {
  brief: string;
  goal: string;
  platform: string;
  agentMode: string;
  budgetGuardrail: string;
  output: string;
  actions: AdsAgentActionInput[];
}) {
  const store = await readStore(tenantId);
  const now = new Date().toISOString();
  const runId = randomUUID();
  const actions: AdsAgentAction[] = payload.actions.slice(0, 12).map((action) => ({
    ...action,
    id: randomUUID(),
    runId,
    status: 'pending',
    executionStatus: 'proposal_only',
    createdAt: now,
    decisionNote: null,
    decidedBy: null,
    decidedAt: null,
  }));

  const run: AdsAgentRun = {
    id: runId,
    brief: payload.brief,
    goal: payload.goal,
    platform: payload.platform,
    agentMode: payload.agentMode,
    budgetGuardrail: payload.budgetGuardrail,
    output: payload.output,
    createdBy: userId ?? null,
    createdAt: now,
    actions,
  };

  store.runs = [run, ...store.runs].slice(0, 50);
  await writeStore(tenantId, store);
  return run;
}

export async function decideAdsAgentAction(tenantId: number, userId: number | undefined, actionId: string, decision: 'approve' | 'revise' | 'defer', note?: string) {
  const store = await readStore(tenantId);
  let updated: AdsAgentAction | null = null;
  const decidedAt = new Date().toISOString();

  store.runs = store.runs.map((run) => ({
    ...run,
    actions: run.actions.map((action) => {
      if (action.id !== actionId) return action;
      const destructive = ['adjust_budget', 'rebalance_budget', 'pause_campaign', 'scale_campaign'].includes(action.actionType);
      const next: AdsAgentAction = {
        ...action,
        status: decision === 'approve' ? 'approved' : decision === 'revise' ? 'revision_requested' : 'deferred',
        executionStatus: decision === 'approve'
          ? destructive
            ? 'awaiting_platform_executor'
            : 'ready_for_manual_execution'
          : decision === 'revise'
            ? 'revision_requested'
            : 'deferred',
        decisionNote: note || null,
        decidedBy: userId ?? null,
        decidedAt,
      };
      updated = next;
      return next;
    }),
  }));

  if (!updated) {
    const err: any = new Error('Ads agent action not found');
    err.statusCode = 404;
    throw err;
  }

  await writeStore(tenantId, store);
  return updated;
}
