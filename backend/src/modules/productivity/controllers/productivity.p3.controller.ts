import { NextFunction, Request, Response } from 'express';
import {
  addDocumentVersion,
  archiveDocument,
  createDocument,
  createDocumentFolder,
  getDocument,
  getDocumentVersionFile,
  grantDocumentAccess,
  listDocumentFolders,
  listDocuments,
} from '../services/document.p3.service';
import {
  createKnowledgeArticle,
  createKnowledgeSpace,
  getKnowledgeArticle,
  listKnowledgeArticles,
  listKnowledgeSpaces,
  reviseKnowledgeArticle,
  transitionKnowledgeArticle,
} from '../services/knowledge.p3.service';
import {
  cancelSignatureRequest,
  createSignatureRequest,
  declinePublicSignatureRequest,
  getPublicSignatureDocument,
  getPublicSignatureRequest,
  listSignatureRequests,
  signPublicSignatureRequest,
} from '../services/sign.p3.service';

const context = (req: Request) => {
  const tenantId = Number(req.tenantId);
  const userId = Number(req.userId);
  const userRole = String(req.userRole || '');
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw Object.assign(new Error('Tenant context required'), { status: 401, code: 'TENANT_REQUIRED' });
  if (!Number.isInteger(userId) || userId <= 0) throw Object.assign(new Error('User context required'), { status: 401, code: 'USER_REQUIRED' });
  return { tenantId, userId, userRole };
};

const publicSignToken = (req: Request) => {
  const token = String(req.header('x-sign-token') || '').trim();
  if (token.length < 32 || token.length > 512) {
    throw Object.assign(new Error('Signature token required'), { status: 401, code: 'SIGN_TOKEN_REQUIRED' });
  }
  return token;
};

export const getFolders = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listDocumentFolders(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postFolder = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createDocumentFolder(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId, userRole } = context(req); const data = await listDocuments(tenantId, userId, userRole, req.query.folderId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId, userRole } = context(req); const data = await getDocument(tenantId, userId, userRole, req.params.id); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = context(req);
    if (!req.file) throw Object.assign(new Error('Document file is required'), { status: 400, code: 'DOCUMENT_FILE_REQUIRED' });
    const data = await createDocument(tenantId, userId, {
      title: req.body.title,
      folderId: req.body.folderId ? Number(req.body.folderId) : null,
      linkedRecordType: req.body.linkedRecordType || null,
      linkedRecordId: req.body.linkedRecordId || null,
    }, req.file);
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
};
export const postDocumentVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId, userRole } = context(req);
    if (!req.file) throw Object.assign(new Error('Document file is required'), { status: 400, code: 'DOCUMENT_FILE_REQUIRED' });
    const data = await addDocumentVersion(tenantId, userId, userRole, req.params.id, req.file);
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
};
export const downloadDocumentVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId, userRole } = context(req);
    const data = await getDocumentVersionFile(tenantId, userId, userRole, req.params.id, req.params.version);
    const safeName = String(data.original_name || 'document').replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', String(data.buffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
    // Buffer is tenant/ACL scoped and forced to an attachment octet-stream with nosniff.
    return res.end(data.buffer);
  } catch (error) { return next(error); }
};
export const postDocumentAccess = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId, userRole } = context(req); const data = await grantDocumentAccess(tenantId, userId, userRole, req.params.id, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const archiveDocumentById = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId, userRole } = context(req); const data = await archiveDocument(tenantId, userId, userRole, req.params.id); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getKnowledgeSpaces = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listKnowledgeSpaces(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postKnowledgeSpace = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createKnowledgeSpace(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const getKnowledgeArticles = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listKnowledgeArticles(tenantId, req.query.spaceId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const getKnowledgeArticleById = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await getKnowledgeArticle(tenantId, req.params.id); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postKnowledgeArticle = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createKnowledgeArticle(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const postKnowledgeRevision = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await reviseKnowledgeArticle(tenantId, userId, req.params.id, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchKnowledgeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionKnowledgeArticle(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getSignatureRequests = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listSignatureRequests(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postSignatureRequest = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId, userRole } = context(req); const data = await createSignatureRequest(tenantId, userId, userRole, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const cancelSignatureRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await cancelSignatureRequest(tenantId, userId, req.params.id); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getPublicSignature = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await getPublicSignatureRequest(publicSignToken(req)); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const downloadPublicSignatureDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getPublicSignatureDocument(publicSignToken(req));
    const safeName = String(data.original_name || 'document').replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', String(data.buffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    // Buffer is token-scoped and forced to an attachment octet-stream with nosniff.
    return res.end(data.buffer);
  } catch (error) { return next(error); }
};
export const signPublicSignature = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await signPublicSignatureRequest(publicSignToken(req), req.body); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const declinePublicSignature = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await declinePublicSignatureRequest(publicSignToken(req)); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
