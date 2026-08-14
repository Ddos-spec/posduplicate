import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  assertStudioEntityType,
  assertStudioFieldKey,
  evaluateStudioCondition,
  normalizeRuleDefinition,
  normalizeStudioValue,
  STUDIO_DATA_TYPES,
  type StudioDataType,
  type StudioRuleAction,
  type StudioRuleCondition,
} from '../services/studioRuleEngine.p3';

interface StudioFieldRow {
  id: bigint | number;
  tenant_id: number;
  entity_type: string;
  field_key: string;
  label: string;
  data_type: StudioDataType;
  is_required: boolean;
  options: unknown[];
  status: string;
  [key: string]: unknown;
}

interface StudioRuleRow {
  id: bigint | number;
  tenant_id: number;
  entity_type: string;
  name: string;
  trigger_event: string;
  condition: StudioRuleCondition;
  action: StudioRuleAction;
  status: string;
  [key: string]: unknown;
}

const RULE_TRIGGERS = ['created', 'updated', 'status_changed', 'manual'] as const;

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

const assertRecord = (value: unknown, code: string) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw domainError('Expected a JSON object', code);
  }
  return value as Record<string, unknown>;
};

const normalizeRecordKey = (value: unknown) => {
  const key = String(value || '').trim();
  if (!key || key.length > 120) throw domainError('Record key is required and must be at most 120 characters', 'STUDIO_RECORD_KEY_INVALID');
  return key;
};

const appendStudioEvent = async (
  tx: Prisma.TransactionClient,
  input: {
    tenantId: number;
    entityType: string;
    entityId: string | number | bigint;
    eventType: string;
    actorUserId: number;
    payload?: Record<string, unknown>;
  },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.studio_events
      (tenant_id,entity_type,entity_id,event_type,actor_user_id,payload)
    VALUES
      (${input.tenantId},${input.entityType},${String(input.entityId)},${input.eventType},${input.actorUserId},CAST(${JSON.stringify(input.payload || {})} AS jsonb))
  `);
};

export const getStudioWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const [fields, rules, executions, events] = await Promise.all([
      prisma.$queryRaw<StudioFieldRow[]>(Prisma.sql`
        SELECT * FROM public.studio_fields WHERE tenant_id=${tenantId}
        ORDER BY entity_type,status,id DESC
      `),
      prisma.$queryRaw<StudioRuleRow[]>(Prisma.sql`
        SELECT * FROM public.studio_workflow_rules WHERE tenant_id=${tenantId}
        ORDER BY entity_type,status,id DESC
      `),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT e.*,r.name AS rule_name FROM public.studio_rule_executions e
        JOIN public.studio_workflow_rules r ON r.id=e.rule_id AND r.tenant_id=e.tenant_id
        WHERE e.tenant_id=${tenantId} ORDER BY e.id DESC LIMIT 50
      `),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT * FROM public.studio_events WHERE tenant_id=${tenantId} ORDER BY id DESC LIMIT 50
      `),
    ]);
    res.json({
      success: true,
      data: {
        fields,
        rules,
        executions,
        events,
        summary: {
          activeFields: fields.filter((field) => field.status === 'active').length,
          activeRules: rules.filter((rule) => rule.status === 'active').length,
          reviewRequired: executions.filter((execution) => execution.execution_status === 'review_required').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createStudioField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const entityType = assertStudioEntityType(req.body.entityType);
    const fieldKey = assertStudioFieldKey(req.body.fieldKey);
    const label = String(req.body.label || '').trim();
    const dataType = String(req.body.dataType || '') as StudioDataType;
    if (!label || label.length > 160) throw domainError('Field label is required and must be at most 160 characters', 'STUDIO_FIELD_LABEL_INVALID');
    if (!STUDIO_DATA_TYPES.includes(dataType)) throw domainError('Studio field data type is invalid', 'STUDIO_DATA_TYPE_INVALID');

    const rawOptions: unknown[] = Array.isArray(req.body.options) ? req.body.options : [];
    const options: string[] = [...new Set(rawOptions.map((option) => String(option).trim()).filter(Boolean))].slice(0, 50);
    if (options.some((option) => option.length > 120)) throw domainError('Studio select options must be at most 120 characters', 'STUDIO_OPTION_INVALID');
    if (dataType === 'select' && options.length === 0) throw domainError('Select fields require at least one option', 'STUDIO_OPTIONS_REQUIRED');
    const normalizedOptions = dataType === 'select' ? options : [];

    const field = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<StudioFieldRow[]>(Prisma.sql`
        INSERT INTO public.studio_fields
          (tenant_id,entity_type,field_key,label,data_type,is_required,options,created_by)
        VALUES
          (${tenantId},${entityType},${fieldKey},${label},${dataType},${Boolean(req.body.isRequired)},CAST(${JSON.stringify(normalizedOptions)} AS jsonb),${actorUserId})
        ON CONFLICT (tenant_id,entity_type,field_key) DO NOTHING
        RETURNING *
      `);
      if (!rows[0]) throw domainError('A field with this key already exists for the entity', 'STUDIO_FIELD_EXISTS', 409);
      await appendStudioEvent(tx, {
        tenantId,
        entityType: 'field',
        entityId: rows[0].id,
        eventType: 'field_created',
        actorUserId,
        payload: { entityType, fieldKey, dataType },
      });
      return rows[0];
    });
    res.status(201).json({ success: true, data: field, message: 'Studio field created' });
  } catch (error) {
    next(error);
  }
};

export const updateStudioFieldStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const fieldId = Number(req.params.id);
    const status = String(req.body.status || '');
    if (!Number.isInteger(fieldId) || fieldId <= 0) throw domainError('Studio field id is invalid', 'STUDIO_FIELD_ID_INVALID');
    if (!['active', 'archived'].includes(status)) throw domainError('Studio field status is invalid', 'STUDIO_FIELD_STATUS_INVALID');
    const field = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<StudioFieldRow[]>(Prisma.sql`
        UPDATE public.studio_fields SET status=${status},updated_at=NOW()
        WHERE id=${fieldId} AND tenant_id=${tenantId} RETURNING *
      `);
      if (!rows[0]) throw domainError('Studio field was not found', 'STUDIO_FIELD_NOT_FOUND', 404);
      await appendStudioEvent(tx, {
        tenantId,
        entityType: 'field',
        entityId: rows[0].id,
        eventType: `field_${status}`,
        actorUserId,
      });
      return rows[0];
    });
    res.json({ success: true, data: field, message: 'Studio field status updated' });
  } catch (error) {
    next(error);
  }
};

export const getStudioRecordValues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const entityType = assertStudioEntityType(req.params.entityType);
    const recordKey = normalizeRecordKey(req.params.recordKey);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT f.id AS field_id,f.field_key,f.label,f.data_type,f.is_required,f.options,v.value,v.updated_at
      FROM public.studio_fields f
      LEFT JOIN public.studio_record_values v
        ON v.tenant_id=f.tenant_id AND v.field_id=f.id AND v.record_key=${recordKey}
      WHERE f.tenant_id=${tenantId} AND f.entity_type=${entityType} AND f.status='active'
      ORDER BY f.id
    `);
    res.json({ success: true, data: { entityType, recordKey, values: rows } });
  } catch (error) {
    next(error);
  }
};

export const upsertStudioRecordValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const fieldId = Number(req.body.fieldId);
    const recordKey = normalizeRecordKey(req.body.recordKey);
    if (!Number.isInteger(fieldId) || fieldId <= 0) throw domainError('Studio field id is invalid', 'STUDIO_FIELD_ID_INVALID');
    const fields = await prisma.$queryRaw<StudioFieldRow[]>(Prisma.sql`
      SELECT * FROM public.studio_fields WHERE id=${fieldId} AND tenant_id=${tenantId} AND status='active' LIMIT 1
    `);
    const field = fields[0];
    if (!field) throw domainError('Active Studio field was not found', 'STUDIO_FIELD_NOT_FOUND', 404);
    const value = normalizeStudioValue(field.data_type, req.body.value, field.is_required, field.options);

    const row = await prisma.$transaction(async (tx) => {
      const values = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO public.studio_record_values
          (tenant_id,field_id,record_key,value,updated_by)
        VALUES
          (${tenantId},${fieldId},${recordKey},CAST(${JSON.stringify(value)} AS jsonb),${actorUserId})
        ON CONFLICT (tenant_id,field_id,record_key) DO UPDATE SET
          value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()
        RETURNING *
      `);
      await appendStudioEvent(tx, {
        tenantId,
        entityType: field.entity_type,
        entityId: recordKey,
        eventType: 'record_value_upserted',
        actorUserId,
        payload: { fieldId, fieldKey: field.field_key },
      });
      return values[0];
    });
    res.json({ success: true, data: row, message: 'Studio value saved' });
  } catch (error) {
    next(error);
  }
};

export const createStudioRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const entityType = assertStudioEntityType(req.body.entityType);
    const name = String(req.body.name || '').trim();
    const triggerEvent = String(req.body.triggerEvent || 'manual') as (typeof RULE_TRIGGERS)[number];
    if (!name || name.length > 180) throw domainError('Rule name is required and must be at most 180 characters', 'STUDIO_RULE_NAME_INVALID');
    if (!RULE_TRIGGERS.includes(triggerEvent)) throw domainError('Rule trigger is invalid', 'STUDIO_RULE_TRIGGER_INVALID');
    const { condition, action } = normalizeRuleDefinition(req.body.condition, req.body.action);

    const rule = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<StudioRuleRow[]>(Prisma.sql`
        INSERT INTO public.studio_workflow_rules
          (tenant_id,entity_type,name,trigger_event,condition,action,created_by)
        VALUES
          (${tenantId},${entityType},${name},${triggerEvent},CAST(${JSON.stringify(condition)} AS jsonb),CAST(${JSON.stringify(action)} AS jsonb),${actorUserId})
        RETURNING *
      `);
      await appendStudioEvent(tx, {
        tenantId,
        entityType: 'rule',
        entityId: rows[0].id,
        eventType: 'rule_created',
        actorUserId,
        payload: { entityType, triggerEvent, actionType: action.type },
      });
      return rows[0];
    });
    res.status(201).json({ success: true, data: rule, message: 'Studio rule created as draft' });
  } catch (error) {
    next(error);
  }
};

export const updateStudioRuleStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const ruleId = Number(req.params.id);
    const status = String(req.body.status || '');
    if (!Number.isInteger(ruleId) || ruleId <= 0) throw domainError('Studio rule id is invalid', 'STUDIO_RULE_ID_INVALID');
    if (!['draft', 'active', 'archived'].includes(status)) throw domainError('Studio rule status is invalid', 'STUDIO_RULE_STATUS_INVALID');
    const rule = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<StudioRuleRow[]>(Prisma.sql`
        UPDATE public.studio_workflow_rules SET status=${status},updated_at=NOW()
        WHERE id=${ruleId} AND tenant_id=${tenantId} RETURNING *
      `);
      if (!rows[0]) throw domainError('Studio rule was not found', 'STUDIO_RULE_NOT_FOUND', 404);
      await appendStudioEvent(tx, {
        tenantId,
        entityType: 'rule',
        entityId: rows[0].id,
        eventType: `rule_${status}`,
        actorUserId,
      });
      return rows[0];
    });
    res.json({ success: true, data: rule, message: 'Studio rule status updated' });
  } catch (error) {
    next(error);
  }
};

const getMatchedRules = async (
  tenantId: number,
  entityType: string,
  triggerEvent: string,
  data: Record<string, unknown>,
) => {
  const rules = await prisma.$queryRaw<StudioRuleRow[]>(Prisma.sql`
    SELECT * FROM public.studio_workflow_rules
    WHERE tenant_id=${tenantId} AND entity_type=${entityType}
      AND trigger_event=${triggerEvent} AND status='active'
    ORDER BY id
  `);
  return rules.filter((rule) => evaluateStudioCondition(rule.condition, data));
};

export const previewStudioRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const entityType = assertStudioEntityType(req.body.entityType);
    const triggerEvent = String(req.body.triggerEvent || 'manual');
    if (!RULE_TRIGGERS.includes(triggerEvent as (typeof RULE_TRIGGERS)[number])) throw domainError('Rule trigger is invalid', 'STUDIO_RULE_TRIGGER_INVALID');
    const data = assertRecord(req.body.data, 'STUDIO_RULE_DATA_INVALID');
    const rules = await getMatchedRules(tenantId, entityType, triggerEvent, data);
    res.json({
      success: true,
      data: {
        matched: rules.map((rule) => ({ id: rule.id, name: rule.name, action: rule.action })),
        matchedCount: rules.length,
        applied: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const applyStudioRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireActor(req);
    const entityType = assertStudioEntityType(req.body.entityType);
    const triggerEvent = String(req.body.triggerEvent || 'manual');
    if (!RULE_TRIGGERS.includes(triggerEvent as (typeof RULE_TRIGGERS)[number])) throw domainError('Rule trigger is invalid', 'STUDIO_RULE_TRIGGER_INVALID');
    const recordKey = normalizeRecordKey(req.body.recordKey);
    const data = assertRecord(req.body.data, 'STUDIO_RULE_DATA_INVALID');
    const rules = await getMatchedRules(tenantId, entityType, triggerEvent, data);

    const executions = await prisma.$transaction(async (tx) => {
      const results: Array<Record<string, unknown>> = [];
      for (const rule of rules) {
        let executionStatus: 'applied' | 'review_required' | 'skipped' = rule.action.type === 'require_approval' ? 'review_required' : 'applied';
        let output: Record<string, unknown> = { action: rule.action };

        if (rule.action.type === 'set_field') {
          const fields = await tx.$queryRaw<StudioFieldRow[]>(Prisma.sql`
            SELECT * FROM public.studio_fields
            WHERE tenant_id=${tenantId} AND entity_type=${entityType}
              AND field_key=${rule.action.field || ''} AND status='active' LIMIT 1
          `);
          const field = fields[0];
          if (!field) {
            executionStatus = 'skipped';
            output = { action: rule.action, reason: 'target_field_not_found' };
          } else {
            const value = normalizeStudioValue(field.data_type, rule.action.value, field.is_required, field.options);
            await tx.$executeRaw(Prisma.sql`
              INSERT INTO public.studio_record_values
                (tenant_id,field_id,record_key,value,updated_by)
              VALUES
                (${tenantId},${Number(field.id)},${recordKey},CAST(${JSON.stringify(value)} AS jsonb),${actorUserId})
              ON CONFLICT (tenant_id,field_id,record_key) DO UPDATE SET
                value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()
            `);
            // pg returns BIGSERIAL values as bigint. Keep the persisted JSON receipt
            // serializable while preserving the identifier exactly.
            output = { action: rule.action, fieldId: String(field.id), fieldKey: field.field_key, value };
          }
        }

        const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          INSERT INTO public.studio_rule_executions
            (tenant_id,rule_id,entity_type,record_key,execution_status,input_snapshot,output,actor_user_id)
          VALUES
            (${tenantId},${Number(rule.id)},${entityType},${recordKey},${executionStatus},CAST(${JSON.stringify(data)} AS jsonb),CAST(${JSON.stringify(output)} AS jsonb),${actorUserId})
          RETURNING *
        `);
        results.push({ ...rows[0], ruleName: rule.name });
      }
      await appendStudioEvent(tx, {
        tenantId,
        entityType,
        entityId: recordKey,
        eventType: 'rules_applied',
        actorUserId,
        payload: { triggerEvent, matchedRuleIds: rules.map((rule) => String(rule.id)), executionCount: results.length },
      });
      return results;
    });

    res.json({ success: true, data: { matchedCount: rules.length, executions, applied: true }, message: 'Studio rules evaluated and audited' });
  } catch (error) {
    next(error);
  }
};
