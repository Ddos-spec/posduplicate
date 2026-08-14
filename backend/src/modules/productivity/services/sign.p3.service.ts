import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { readPrivateDocument } from './privateDocumentStorage.p3';

const CONSENT_TEXT = 'I confirm that I have reviewed this exact document version and intend my typed name to serve as my electronic signature.';
const domainError = (message: string, code: string, status = 400) => Object.assign(new Error(message), { code, status });
const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw domainError('Expected positive integer', code);
  return parsed;
};
const cleanText = (value: unknown, max: number, code: string, required = true) => {
  const text = String(value ?? '').trim();
  if ((required && !text) || text.length > max) throw domainError('Invalid text value', code);
  return text || null;
};
const email = (value: unknown) => {
  const text = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || text.length > 240) throw domainError('Invalid recipient email', 'INVALID_SIGNATURE_RECIPIENT_EMAIL');
  return text;
};
const elevatedRole = (role: string) => ['owner','manager','admin','super admin','super_admin'].includes(String(role || '').trim().toLowerCase());
const newToken = () => crypto.randomBytes(32).toString('hex');
const tokenHash = (value: unknown) => {
  const token = String(value || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) throw domainError('Valid signature token required', 'SIGNATURE_TOKEN_REQUIRED', 400);
  return crypto.createHash('sha256').update(token).digest('hex');
};
const parseExpiry = (value: unknown) => {
  if (value == null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) throw domainError('Signature expiry must be in the future', 'INVALID_SIGNATURE_EXPIRY');
  if (date.getTime() > Date.now() + 180 * 24 * 60 * 60 * 1000) throw domainError('Signature expiry cannot exceed 180 days', 'INVALID_SIGNATURE_EXPIRY');
  return date;
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; entityType: 'signature_request' | 'signature_recipient'; entityId: number; eventType: string; actorUserId?: number | null; actorRecipientId?: number | null; payload?: Record<string, unknown> },
) => tx.$executeRaw(Prisma.sql`
  INSERT INTO public.productivity_events
    (tenant_id,entity_type,entity_id,event_type,actor_user_id,actor_recipient_id,payload)
  VALUES (${input.tenantId},${input.entityType},${input.entityId},${input.eventType},${input.actorUserId ?? null},${input.actorRecipientId ?? null},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb))
`);

const ensureDocumentManage = async (tx: Prisma.TransactionClient, tenantId: number, userId: number, role: string, documentId: number) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id,title,status,current_version,owner_user_id,created_by
    FROM public.business_documents WHERE tenant_id=${tenantId} AND id=${documentId} FOR UPDATE
  `);
  const document = rows[0];
  if (!document) throw domainError('Document not found', 'DOCUMENT_NOT_FOUND', 404);
  if (document.status !== 'active' || Number(document.current_version) <= 0) throw domainError('Only active versioned documents can be signed', 'DOCUMENT_NOT_SIGNABLE', 409);
  if (!elevatedRole(role) && Number(document.owner_user_id) !== userId && Number(document.created_by) !== userId) {
    const acl = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.business_document_acl
      WHERE tenant_id=${tenantId} AND document_id=${documentId} AND access_level='manage'
        AND ((principal_type='user' AND principal_user_id=${userId})
          OR (principal_type='role' AND lower(role_name)=lower(${String(role || '')})))
      LIMIT 1
    `);
    if (!acl[0]) throw domainError('Document manage access required for signature request', 'DOCUMENT_ACCESS_DENIED', 403);
  }
  return document;
};

export const listSignatureRequests = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT r.*,d.title AS document_title,v.version_no,v.sha256 AS document_sha256,
    COALESCE((SELECT COUNT(*) FROM public.signature_recipients sr WHERE sr.tenant_id=r.tenant_id AND sr.request_id=r.id),0)::int AS recipient_count,
    COALESCE((SELECT COUNT(*) FROM public.signature_recipients sr WHERE sr.tenant_id=r.tenant_id AND sr.request_id=r.id AND sr.status='signed'),0)::int AS signed_count
  FROM public.signature_requests r
  JOIN public.business_documents d ON d.id=r.document_id AND d.tenant_id=r.tenant_id
  JOIN public.business_document_versions v ON v.id=r.document_version_id AND v.tenant_id=r.tenant_id
  WHERE r.tenant_id=${tenantId}
  ORDER BY r.id DESC
`);

export const createSignatureRequest = async (
  tenantId: number,
  userId: number,
  userRole: string,
  input: {
    documentId: number;
    subject: string;
    message?: string | null;
    expiresAt?: string | null;
    recipients: Array<{ type?: 'external' | 'user'; userId?: number | null; name?: string; email?: string; signingOrder?: number }>;
  },
) => {
  const documentId = positiveInt(input.documentId, 'INVALID_DOCUMENT_ID');
  const subject = cleanText(input.subject, 240, 'INVALID_SIGNATURE_SUBJECT') as string;
  const message = cleanText(input.message, 5000, 'INVALID_SIGNATURE_MESSAGE', false);
  const expiresAt = parseExpiry(input.expiresAt);
  if (!Array.isArray(input.recipients) || input.recipients.length < 1 || input.recipients.length > 20) {
    throw domainError('Signature request requires 1-20 recipients', 'INVALID_SIGNATURE_RECIPIENTS');
  }
  const orders = input.recipients.map((recipient, index) => recipient.signingOrder == null ? index + 1 : positiveInt(recipient.signingOrder, 'INVALID_SIGNATURE_ORDER'));
  if (new Set(orders).size !== orders.length) throw domainError('Signing order must be unique', 'DUPLICATE_SIGNATURE_ORDER');

  return prisma.$transaction(async (tx) => {
    const document = await ensureDocumentManage(tx, tenantId, userId, userRole, documentId);
    const versionRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id,version_no,sha256,original_name,mime_type,size_bytes
      FROM public.business_document_versions
      WHERE tenant_id=${tenantId} AND document_id=${documentId} AND version_no=${Number(document.current_version)}
      LIMIT 1
    `);
    const version = versionRows[0];
    if (!version) throw domainError('Current document version not found', 'DOCUMENT_VERSION_NOT_FOUND', 409);

    const requestRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.signature_requests
        (tenant_id,document_id,document_version_id,subject,message,status,expires_at,created_by,sent_at)
      VALUES (${tenantId},${documentId},${Number(version.id)},${subject},${message},'sent',${expiresAt},${userId},NOW())
      RETURNING *
    `);
    const request = requestRows[0];
    const recipients: any[] = [];
    for (let index = 0; index < input.recipients.length; index += 1) {
      const item = input.recipients[index];
      const recipientType = item.type === 'user' ? 'user' : 'external';
      let recipientUserId: number | null = null;
      let recipientName = cleanText(item.name, 180, 'INVALID_SIGNATURE_RECIPIENT_NAME', recipientType === 'external');
      let recipientEmail = item.email ? email(item.email) : null;
      if (recipientType === 'user') {
        recipientUserId = positiveInt(item.userId, 'INVALID_SIGNATURE_RECIPIENT_USER');
        const userRows = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT id,name,email FROM public.users WHERE id=${recipientUserId} AND tenant_id=${tenantId} AND is_active=TRUE LIMIT 1
        `);
        const user = userRows[0];
        if (!user) throw domainError('Signature recipient user not found in tenant', 'SIGNATURE_RECIPIENT_NOT_FOUND', 404);
        recipientName = cleanText(item.name || user.name, 180, 'INVALID_SIGNATURE_RECIPIENT_NAME') as string;
        recipientEmail = email(item.email || user.email);
      }
      if (!recipientName || !recipientEmail) throw domainError('Recipient name and email required', 'INVALID_SIGNATURE_RECIPIENT');
      const rawToken = newToken();
      const hash = tokenHash(rawToken);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.signature_recipients
          (tenant_id,request_id,recipient_type,user_id,recipient_name,recipient_email,signing_order,status,access_token_hash)
        VALUES (${tenantId},${Number(request.id)},${recipientType},${recipientUserId},${recipientName},${recipientEmail},${orders[index]},'pending',${hash})
        RETURNING id,recipient_type,user_id,recipient_name,recipient_email,signing_order,status
      `);
      recipients.push({ ...rows[0], token: rawToken });
    }
    await appendEvent(tx, { tenantId, entityType: 'signature_request', entityId: Number(request.id), eventType: 'sent', actorUserId: userId, payload: { documentId, version: Number(version.version_no), recipientCount: recipients.length } });
    return { ...request, document_title: document.title, document_version: version, consent_text: CONSENT_TEXT, recipients };
  });
};

const getRecipientForPublic = async (tx: Prisma.TransactionClient, hash: string, lock = false) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT sr.*,r.status AS request_status,r.subject,r.message,r.expires_at,r.document_id,r.document_version_id,
      d.title AS document_title,v.version_no,v.sha256 AS document_sha256,v.storage_key,v.original_name,v.mime_type,v.size_bytes
    FROM public.signature_recipients sr
    JOIN public.signature_requests r ON r.id=sr.request_id AND r.tenant_id=sr.tenant_id
    JOIN public.business_documents d ON d.id=r.document_id AND d.tenant_id=r.tenant_id
    JOIN public.business_document_versions v ON v.id=r.document_version_id AND v.tenant_id=r.tenant_id
    WHERE sr.access_token_hash=${hash}
    LIMIT 1
    ${lock ? Prisma.sql`FOR UPDATE OF sr,r` : Prisma.empty}
  `);
  const recipient = rows[0];
  if (!recipient) throw domainError('Signature request not found', 'SIGNATURE_TOKEN_NOT_FOUND', 404);
  return recipient;
};

const ensureRequestUsable = async (tx: Prisma.TransactionClient, recipient: any) => {
  if (recipient.request_status === 'completed' && recipient.status === 'signed') return;
  if (recipient.request_status !== 'sent') throw domainError('Signature request is not active', 'SIGNATURE_REQUEST_NOT_ACTIVE', 409);
  if (recipient.expires_at && new Date(recipient.expires_at).getTime() <= Date.now()) {
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.signature_requests SET status='expired',updated_at=NOW()
      WHERE tenant_id=${Number(recipient.tenant_id)} AND id=${Number(recipient.request_id)} AND status='sent'
    `);
    throw domainError('Signature request has expired', 'SIGNATURE_REQUEST_EXPIRED', 410);
  }
};

export const getPublicSignatureRequest = async (tokenValue: unknown) => {
  const hash = tokenHash(tokenValue);
  return prisma.$transaction(async (tx) => {
    const recipient = await getRecipientForPublic(tx, hash, false);
    await ensureRequestUsable(tx, recipient);
    return {
      subject: recipient.subject,
      message: recipient.message,
      recipient_name: recipient.recipient_name,
      recipient_email: recipient.recipient_email,
      recipient_status: recipient.status,
      signing_order: recipient.signing_order,
      document: {
        id: recipient.document_id,
        title: recipient.document_title,
        version: recipient.version_no,
        sha256: recipient.document_sha256,
        original_name: recipient.original_name,
        mime_type: recipient.mime_type,
        size_bytes: recipient.size_bytes,
      },
      expires_at: recipient.expires_at,
      consent_text: CONSENT_TEXT,
    };
  });
};

export const getPublicSignatureDocument = async (tokenValue: unknown) => {
  const hash = tokenHash(tokenValue);
  const meta = await prisma.$transaction(async (tx) => {
    const recipient = await getRecipientForPublic(tx, hash, false);
    await ensureRequestUsable(tx, recipient);
    return { storage_key: recipient.storage_key, original_name: recipient.original_name, mime_type: recipient.mime_type, size_bytes: recipient.size_bytes };
  });
  return { ...meta, buffer: await readPrivateDocument(meta.storage_key) };
};

export const signPublicSignatureRequest = async (tokenValue: unknown, input: { signatureName: string; consentAccepted: boolean }) => {
  const hash = tokenHash(tokenValue);
  const signatureName = cleanText(input.signatureName, 180, 'INVALID_SIGNATURE_NAME') as string;
  if (input.consentAccepted !== true) throw domainError('Signature consent is required', 'SIGNATURE_CONSENT_REQUIRED');
  return prisma.$transaction(async (tx) => {
    const recipient = await getRecipientForPublic(tx, hash, true);
    if (recipient.status === 'signed') return { status: 'signed', signed_at: recipient.signed_at, evidence_hash: recipient.signature_evidence_hash };
    await ensureRequestUsable(tx, recipient);
    if (recipient.status !== 'pending') throw domainError('Signature recipient is not pending', 'SIGNATURE_RECIPIENT_NOT_PENDING', 409);
    const earlier = await tx.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM public.signature_recipients
      WHERE tenant_id=${Number(recipient.tenant_id)} AND request_id=${Number(recipient.request_id)}
        AND signing_order < ${Number(recipient.signing_order)} AND status <> 'signed'
    `);
    if (Number(earlier[0]?.count || 0) > 0) throw domainError('Earlier recipients must sign first', 'SIGNATURE_ORDER_BLOCKED', 409);
    const signedAt = new Date();
    const evidence = crypto.createHash('sha256').update([
      String(recipient.document_sha256),
      String(recipient.id),
      String(recipient.recipient_email).toLowerCase(),
      signatureName,
      signedAt.toISOString(),
      CONSENT_TEXT,
    ].join('|')).digest('hex');
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.signature_recipients
      SET status='signed',signature_type='typed',signature_name=${signatureName},signature_evidence_hash=${evidence},consent_text=${CONSENT_TEXT},signed_at=${signedAt}
      WHERE id=${Number(recipient.id)} AND tenant_id=${Number(recipient.tenant_id)} AND status='pending'
      RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent signature update', 'SIGNATURE_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId: Number(recipient.tenant_id), entityType: 'signature_recipient', entityId: Number(recipient.id), eventType: 'signed', actorRecipientId: Number(recipient.id), payload: { requestId: Number(recipient.request_id), documentVersionId: Number(recipient.document_version_id), evidenceHash: evidence } });
    const remaining = await tx.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM public.signature_recipients
      WHERE tenant_id=${Number(recipient.tenant_id)} AND request_id=${Number(recipient.request_id)} AND status <> 'signed'
    `);
    if (Number(remaining[0]?.count || 0) === 0) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.signature_requests SET status='completed',completed_at=NOW(),updated_at=NOW()
        WHERE tenant_id=${Number(recipient.tenant_id)} AND id=${Number(recipient.request_id)} AND status='sent'
      `);
      await appendEvent(tx, { tenantId: Number(recipient.tenant_id), entityType: 'signature_request', entityId: Number(recipient.request_id), eventType: 'completed', actorRecipientId: Number(recipient.id) });
    }
    return { status: 'signed', signed_at: signedAt, evidence_hash: evidence };
  });
};

export const declinePublicSignatureRequest = async (tokenValue: unknown) => {
  const hash = tokenHash(tokenValue);
  return prisma.$transaction(async (tx) => {
    const recipient = await getRecipientForPublic(tx, hash, true);
    if (recipient.status === 'declined') return { status: 'declined', declined_at: recipient.declined_at };
    await ensureRequestUsable(tx, recipient);
    if (recipient.status !== 'pending') throw domainError('Signature recipient is not pending', 'SIGNATURE_RECIPIENT_NOT_PENDING', 409);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.signature_recipients SET status='declined',declined_at=NOW()
      WHERE id=${Number(recipient.id)} AND tenant_id=${Number(recipient.tenant_id)} AND status='pending' RETURNING *
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.signature_requests SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
      WHERE tenant_id=${Number(recipient.tenant_id)} AND id=${Number(recipient.request_id)} AND status='sent'
    `);
    await appendEvent(tx, { tenantId: Number(recipient.tenant_id), entityType: 'signature_recipient', entityId: Number(recipient.id), eventType: 'declined', actorRecipientId: Number(recipient.id), payload: { requestId: Number(recipient.request_id) } });
    return { status: 'declined', declined_at: rows[0]?.declined_at };
  });
};

export const cancelSignatureRequest = async (tenantId: number, userId: number, requestIdValue: unknown) => {
  const requestId = positiveInt(requestIdValue, 'INVALID_SIGNATURE_REQUEST_ID');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.signature_requests WHERE tenant_id=${tenantId} AND id=${requestId} FOR UPDATE
    `);
    const request = rows[0];
    if (!request) throw domainError('Signature request not found', 'SIGNATURE_REQUEST_NOT_FOUND', 404);
    if (request.status === 'cancelled') return request;
    if (!['draft','sent'].includes(String(request.status))) throw domainError('Signature request can no longer be cancelled', 'INVALID_SIGNATURE_REQUEST_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.signature_requests SET status='cancelled',cancelled_at=NOW(),updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${requestId} AND status=${String(request.status)} RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent signature request update', 'SIGNATURE_REQUEST_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, entityType: 'signature_request', entityId: requestId, eventType: 'cancelled', actorUserId: userId });
    return changed[0];
  });
};

export { CONSENT_TEXT };
