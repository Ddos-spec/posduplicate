import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  buildPrivateStorageKey,
  deletePrivateDocument,
  readPrivateDocument,
  validatePrivateDocumentUpload,
  writePrivateDocument,
} from './privateDocumentStorage.p3';

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
const elevatedRole = (role: string) => ['owner','manager','admin','super admin','super_admin'].includes(String(role || '').trim().toLowerCase());
const accessRank: Record<string, number> = { view: 1, edit: 2, manage: 3 };

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; entityType: 'document' | 'document_version'; entityId: number; eventType: string; userId: number; payload?: Record<string, unknown> },
) => tx.$executeRaw(Prisma.sql`
  INSERT INTO public.productivity_events (tenant_id,entity_type,entity_id,event_type,actor_user_id,payload)
  VALUES (${input.tenantId},${input.entityType},${input.entityId},${input.eventType},${input.userId},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb))
`);

const ensureDocumentAccess = async (
  tx: Prisma.TransactionClient,
  tenantId: number,
  userId: number,
  userRole: string,
  documentId: number,
  required: 'view' | 'edit' | 'manage',
) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id,tenant_id,title,status,current_version,owner_user_id,created_by,folder_id,linked_record_type,linked_record_id
    FROM public.business_documents
    WHERE tenant_id=${tenantId} AND id=${documentId}
    LIMIT 1
  `);
  const document = rows[0];
  if (!document) throw domainError('Document not found', 'DOCUMENT_NOT_FOUND', 404);
  if (elevatedRole(userRole) || Number(document.owner_user_id) === userId || Number(document.created_by) === userId) return document;

  const aclRows = await tx.$queryRaw<Array<{ access_level: string }>>(Prisma.sql`
    SELECT access_level FROM public.business_document_acl
    WHERE tenant_id=${tenantId} AND document_id=${documentId}
      AND (
        (principal_type='user' AND principal_user_id=${userId}) OR
        (principal_type='role' AND lower(role_name)=lower(${String(userRole || '')}))
      )
    ORDER BY CASE access_level WHEN 'manage' THEN 3 WHEN 'edit' THEN 2 ELSE 1 END DESC
    LIMIT 1
  `);
  const granted = accessRank[String(aclRows[0]?.access_level || '')] || 0;
  if (granted < accessRank[required]) throw domainError('Document access denied', 'DOCUMENT_ACCESS_DENIED', 403);
  return document;
};

export const listDocumentFolders = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT f.*,
    COALESCE((SELECT COUNT(*) FROM public.business_documents d WHERE d.tenant_id=f.tenant_id AND d.folder_id=f.id AND d.status <> 'archived'),0)::int AS document_count
  FROM public.document_folders f WHERE f.tenant_id=${tenantId}
  ORDER BY COALESCE(f.parent_id,0),lower(f.name),f.id
`);

export const createDocumentFolder = async (tenantId: number, userId: number, input: { name: string; parentId?: number | null }) => {
  const name = cleanText(input.name, 180, 'INVALID_DOCUMENT_FOLDER_NAME') as string;
  const parentId = input.parentId == null ? null : positiveInt(input.parentId, 'INVALID_DOCUMENT_FOLDER_ID');
  return prisma.$transaction(async (tx) => {
    if (parentId) {
      const parent = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.document_folders WHERE tenant_id=${tenantId} AND id=${parentId} LIMIT 1`);
      if (!parent[0]) throw domainError('Parent folder not found', 'DOCUMENT_FOLDER_NOT_FOUND', 404);
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.document_folders (tenant_id,parent_id,name,created_by)
      VALUES (${tenantId},${parentId},${name},${userId}) RETURNING *
    `);
    return rows[0];
  });
};

export const listDocuments = async (tenantId: number, userId: number, userRole: string, folderIdValue?: unknown) => {
  const folderId = folderIdValue == null || folderIdValue === '' ? null : positiveInt(folderIdValue, 'INVALID_DOCUMENT_FOLDER_ID');
  const elevated = elevatedRole(userRole);
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT d.*,f.name AS folder_name,
      v.original_name,v.mime_type,v.size_bytes,v.sha256,v.created_at AS version_created_at
    FROM public.business_documents d
    LEFT JOIN public.document_folders f ON f.id=d.folder_id AND f.tenant_id=d.tenant_id
    LEFT JOIN public.business_document_versions v
      ON v.tenant_id=d.tenant_id AND v.document_id=d.id AND v.version_no=d.current_version
    WHERE d.tenant_id=${tenantId}
      AND (${folderId}::bigint IS NULL OR d.folder_id=${folderId})
      AND (
        ${elevated} OR d.owner_user_id=${userId} OR d.created_by=${userId} OR EXISTS (
          SELECT 1 FROM public.business_document_acl acl
          WHERE acl.tenant_id=d.tenant_id AND acl.document_id=d.id
            AND ((acl.principal_type='user' AND acl.principal_user_id=${userId})
              OR (acl.principal_type='role' AND lower(acl.role_name)=lower(${String(userRole || '')})))
        )
      )
    ORDER BY d.updated_at DESC,d.id DESC
  `);
};

export const getDocument = async (tenantId: number, userId: number, userRole: string, documentIdValue: unknown) => {
  const documentId = positiveInt(documentIdValue, 'INVALID_DOCUMENT_ID');
  return prisma.$transaction(async (tx) => {
    const document = await ensureDocumentAccess(tx, tenantId, userId, userRole, documentId, 'view');
    const versions = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id,version_no,original_name,mime_type,size_bytes,sha256,created_by,created_at
      FROM public.business_document_versions
      WHERE tenant_id=${tenantId} AND document_id=${documentId}
      ORDER BY version_no DESC
    `);
    const acl = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id,principal_type,principal_user_id,role_name,access_level,granted_by,created_at
      FROM public.business_document_acl WHERE tenant_id=${tenantId} AND document_id=${documentId} ORDER BY id
    `);
    return { ...document, versions, acl };
  });
};

export const createDocument = async (
  tenantId: number,
  userId: number,
  input: { title: string; folderId?: number | null; linkedRecordType?: string | null; linkedRecordId?: string | null },
  file: Express.Multer.File,
) => {
  const upload = validatePrivateDocumentUpload(file);
  const title = cleanText(input.title, 240, 'INVALID_DOCUMENT_TITLE') as string;
  const folderId = input.folderId == null ? null : positiveInt(input.folderId, 'INVALID_DOCUMENT_FOLDER_ID');
  const linkedRecordType = cleanText(input.linkedRecordType, 80, 'INVALID_DOCUMENT_LINK_TYPE', false);
  const linkedRecordId = cleanText(input.linkedRecordId, 120, 'INVALID_DOCUMENT_LINK_ID', false);
  let storageKey = '';
  try {
    return await prisma.$transaction(async (tx) => {
      if (folderId) {
        const folder = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.document_folders WHERE tenant_id=${tenantId} AND id=${folderId} LIMIT 1`);
        if (!folder[0]) throw domainError('Document folder not found', 'DOCUMENT_FOLDER_NOT_FOUND', 404);
      }
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.business_documents
          (tenant_id,folder_id,title,status,current_version,owner_user_id,linked_record_type,linked_record_id,created_by,updated_by)
        VALUES (${tenantId},${folderId},${title},'active',1,${userId},${linkedRecordType},${linkedRecordId},${userId},${userId})
        RETURNING *
      `);
      const document = rows[0];
      storageKey = buildPrivateStorageKey(tenantId, Number(document.id), 1);
      await writePrivateDocument(storageKey, upload.buffer);
      const versionRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.business_document_versions
          (tenant_id,document_id,version_no,storage_key,original_name,mime_type,size_bytes,sha256,created_by)
        VALUES (${tenantId},${Number(document.id)},1,${storageKey},${upload.originalName},${upload.mimeType},${upload.sizeBytes},${upload.sha256},${userId})
        RETURNING id,version_no,original_name,mime_type,size_bytes,sha256,created_at
      `);
      await appendEvent(tx, { tenantId, entityType: 'document', entityId: Number(document.id), eventType: 'created', userId, payload: { version: 1 } });
      await appendEvent(tx, { tenantId, entityType: 'document_version', entityId: Number(versionRows[0].id), eventType: 'uploaded', userId, payload: { documentId: Number(document.id), version: 1, sha256: upload.sha256 } });
      return { ...document, version: versionRows[0] };
    });
  } catch (error) {
    if (storageKey) await deletePrivateDocument(storageKey).catch(() => undefined);
    throw error;
  }
};

export const addDocumentVersion = async (
  tenantId: number,
  userId: number,
  userRole: string,
  documentIdValue: unknown,
  file: Express.Multer.File,
) => {
  const documentId = positiveInt(documentIdValue, 'INVALID_DOCUMENT_ID');
  const upload = validatePrivateDocumentUpload(file);
  let storageKey = '';
  try {
    return await prisma.$transaction(async (tx) => {
      const document = await ensureDocumentAccess(tx, tenantId, userId, userRole, documentId, 'edit');
      if (document.status === 'archived') throw domainError('Archived document cannot receive new versions', 'DOCUMENT_ARCHIVED', 409);
      const existing = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id,version_no,original_name,mime_type,size_bytes,sha256,created_at
        FROM public.business_document_versions
        WHERE tenant_id=${tenantId} AND document_id=${documentId} AND sha256=${upload.sha256}
        LIMIT 1
      `);
      if (existing[0]) return existing[0];
      const versionNo = Number(document.current_version) + 1;
      storageKey = buildPrivateStorageKey(tenantId, documentId, versionNo);
      await writePrivateDocument(storageKey, upload.buffer);
      const versionRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.business_document_versions
          (tenant_id,document_id,version_no,storage_key,original_name,mime_type,size_bytes,sha256,created_by)
        VALUES (${tenantId},${documentId},${versionNo},${storageKey},${upload.originalName},${upload.mimeType},${upload.sizeBytes},${upload.sha256},${userId})
        RETURNING id,version_no,original_name,mime_type,size_bytes,sha256,created_at
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.business_documents SET current_version=${versionNo},updated_by=${userId},updated_at=NOW()
        WHERE tenant_id=${tenantId} AND id=${documentId}
      `);
      await appendEvent(tx, { tenantId, entityType: 'document_version', entityId: Number(versionRows[0].id), eventType: 'uploaded', userId, payload: { documentId, version: versionNo, sha256: upload.sha256 } });
      return versionRows[0];
    });
  } catch (error) {
    if (storageKey) await deletePrivateDocument(storageKey).catch(() => undefined);
    throw error;
  }
};

export const getDocumentVersionFile = async (
  tenantId: number,
  userId: number,
  userRole: string,
  documentIdValue: unknown,
  versionNoValue: unknown,
) => {
  const documentId = positiveInt(documentIdValue, 'INVALID_DOCUMENT_ID');
  const versionNo = positiveInt(versionNoValue, 'INVALID_DOCUMENT_VERSION');
  const meta = await prisma.$transaction(async (tx) => {
    await ensureDocumentAccess(tx, tenantId, userId, userRole, documentId, 'view');
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT storage_key,original_name,mime_type,size_bytes,sha256
      FROM public.business_document_versions
      WHERE tenant_id=${tenantId} AND document_id=${documentId} AND version_no=${versionNo}
      LIMIT 1
    `);
    if (!rows[0]) throw domainError('Document version not found', 'DOCUMENT_VERSION_NOT_FOUND', 404);
    return rows[0];
  });
  return { ...meta, buffer: await readPrivateDocument(meta.storage_key) };
};

export const grantDocumentAccess = async (
  tenantId: number,
  userId: number,
  userRole: string,
  documentIdValue: unknown,
  input: { principalType: 'user' | 'role'; principalUserId?: number | null; roleName?: string | null; accessLevel: 'view' | 'edit' | 'manage' },
) => {
  const documentId = positiveInt(documentIdValue, 'INVALID_DOCUMENT_ID');
  const level = String(input.accessLevel || '').trim();
  if (!accessRank[level]) throw domainError('Invalid document access level', 'INVALID_DOCUMENT_ACCESS_LEVEL');
  return prisma.$transaction(async (tx) => {
    await ensureDocumentAccess(tx, tenantId, userId, userRole, documentId, 'manage');
    const principalType = input.principalType;
    let principalUserId: number | null = null;
    let roleName: string | null = null;
    if (principalType === 'user') {
      principalUserId = positiveInt(input.principalUserId, 'INVALID_DOCUMENT_PRINCIPAL_USER');
      const userRows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.users WHERE id=${principalUserId} AND tenant_id=${tenantId} LIMIT 1`);
      if (!userRows[0]) throw domainError('Principal user not found in tenant', 'DOCUMENT_PRINCIPAL_NOT_FOUND', 404);
    } else if (principalType === 'role') {
      roleName = cleanText(input.roleName, 80, 'INVALID_DOCUMENT_PRINCIPAL_ROLE') as string;
    } else throw domainError('Invalid document principal type', 'INVALID_DOCUMENT_PRINCIPAL');

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.business_document_acl
      WHERE tenant_id=${tenantId} AND document_id=${documentId}
        AND ((${principalType}='user' AND principal_type='user' AND principal_user_id=${principalUserId})
          OR (${principalType}='role' AND principal_type='role' AND lower(role_name)=lower(${roleName})))
    `);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.business_document_acl
        (tenant_id,document_id,principal_type,principal_user_id,role_name,access_level,granted_by)
      VALUES (${tenantId},${documentId},${principalType},${principalUserId},${roleName},${level},${userId}) RETURNING *
    `);
    await appendEvent(tx, { tenantId, entityType: 'document', entityId: documentId, eventType: 'access_granted', userId, payload: { principalType, principalUserId, roleName, accessLevel: level } });
    return rows[0];
  });
};

export const archiveDocument = async (tenantId: number, userId: number, userRole: string, documentIdValue: unknown) => {
  const documentId = positiveInt(documentIdValue, 'INVALID_DOCUMENT_ID');
  return prisma.$transaction(async (tx) => {
    const document = await ensureDocumentAccess(tx, tenantId, userId, userRole, documentId, 'manage');
    if (document.status === 'archived') return document;
    const openSignatures = await tx.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM public.signature_requests
      WHERE tenant_id=${tenantId} AND document_id=${documentId} AND status IN ('draft','sent')
    `);
    if (Number(openSignatures[0]?.count || 0) > 0) throw domainError('Document has an active signature request', 'DOCUMENT_SIGNATURE_ACTIVE', 409);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.business_documents SET status='archived',archived_at=NOW(),updated_by=${userId},updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${documentId} RETURNING *
    `);
    await appendEvent(tx, { tenantId, entityType: 'document', entityId: documentId, eventType: 'archived', userId });
    return rows[0];
  });
};
