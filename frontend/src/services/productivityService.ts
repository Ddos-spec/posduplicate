import api from './api';

export interface DocumentFolder {
  id: number;
  parent_id?: number | null;
  name: string;
  document_count?: number;
}

export interface BusinessDocumentVersion {
  id: number;
  version_no: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
}

export interface BusinessDocument {
  id: number;
  folder_id?: number | null;
  folder_name?: string | null;
  title: string;
  status: 'draft' | 'active' | 'archived';
  current_version: number;
  owner_user_id?: number | null;
  linked_record_type?: string | null;
  linked_record_id?: string | null;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  sha256?: string;
  versions?: BusinessDocumentVersion[];
  acl?: Array<{ id: number; principal_type: 'user' | 'role'; principal_user_id?: number | null; role_name?: string | null; access_level: 'view' | 'edit' | 'manage' }>;
}

export interface KnowledgeSpace {
  id: number;
  name: string;
  description?: string | null;
  visibility: 'tenant' | 'restricted';
  article_count?: number;
}

export interface KnowledgeBlock {
  type: 'heading' | 'paragraph' | 'callout' | 'checklist' | 'code' | 'link';
  text?: string;
  level?: number;
  items?: Array<{ text: string; checked?: boolean }>;
  href?: string;
  language?: string;
}

export interface KnowledgeArticle {
  id: number;
  space_id: number;
  space_name?: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  current_version: number;
  content?: KnowledgeBlock[];
  summary?: string | null;
  updated_at?: string;
}

export interface SignatureRecipientCreation {
  id: number;
  recipient_type: 'user' | 'external';
  user_id?: number | null;
  recipient_name: string;
  recipient_email: string;
  signing_order: number;
  status: 'pending' | 'signed' | 'declined';
  token: string;
}

export interface SignatureRequest {
  id: number;
  document_id: number;
  document_version_id: number;
  document_title?: string;
  subject: string;
  message?: string | null;
  status: 'draft' | 'sent' | 'completed' | 'cancelled' | 'expired';
  expires_at?: string | null;
  recipient_count?: number;
  signed_count?: number;
  document_version?: BusinessDocumentVersion;
  consent_text?: string;
  recipients?: SignatureRecipientCreation[];
}

export interface PublicSignatureRequest {
  subject: string;
  message?: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_status: 'pending' | 'signed' | 'declined';
  signing_order: number;
  document: {
    id: number;
    title: string;
    version: number;
    sha256: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
  };
  expires_at?: string | null;
  consent_text: string;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;
const signHeaders = (token: string) => ({ 'X-Sign-Token': token });

export const getDocumentFolders = async () => unwrap<DocumentFolder[]>(await api.get('/productivity/documents/folders'));
export const createDocumentFolder = async (payload: { name: string; parentId?: number | null }) => unwrap<DocumentFolder>(await api.post('/productivity/documents/folders', payload));
export const getDocuments = async (folderId?: number | null) => unwrap<BusinessDocument[]>(await api.get('/productivity/documents', { params: folderId ? { folderId } : undefined }));
export const getDocument = async (id: number) => unwrap<BusinessDocument>(await api.get(`/productivity/documents/${id}`));
export const uploadDocument = async (payload: { title: string; folderId?: number | null; linkedRecordType?: string; linkedRecordId?: string; file: File }) => {
  const data = new FormData();
  data.set('title', payload.title);
  if (payload.folderId) data.set('folderId', String(payload.folderId));
  if (payload.linkedRecordType) data.set('linkedRecordType', payload.linkedRecordType);
  if (payload.linkedRecordId) data.set('linkedRecordId', payload.linkedRecordId);
  data.set('file', payload.file);
  return unwrap<BusinessDocument>(await api.post('/productivity/documents', data));
};
export const uploadDocumentVersion = async (id: number, file: File) => {
  const data = new FormData();
  data.set('file', file);
  return unwrap<BusinessDocumentVersion>(await api.post(`/productivity/documents/${id}/versions`, data));
};
export const downloadDocumentVersion = async (id: number, version: number) => api.get(`/productivity/documents/${id}/versions/${version}/download`, { responseType: 'blob' });
export const grantDocumentAccess = async (id: number, payload: { principalType: 'user' | 'role'; principalUserId?: number; roleName?: string; accessLevel: 'view' | 'edit' | 'manage' }) => unwrap(await api.post(`/productivity/documents/${id}/access`, payload));
export const archiveDocument = async (id: number) => unwrap<BusinessDocument>(await api.patch(`/productivity/documents/${id}/archive`));

export const getKnowledgeSpaces = async () => unwrap<KnowledgeSpace[]>(await api.get('/productivity/knowledge/spaces'));
export const createKnowledgeSpace = async (payload: { name: string; description?: string }) => unwrap<KnowledgeSpace>(await api.post('/productivity/knowledge/spaces', payload));
export const getKnowledgeArticles = async (spaceId?: number | null) => unwrap<KnowledgeArticle[]>(await api.get('/productivity/knowledge/articles', { params: spaceId ? { spaceId } : undefined }));
export const getKnowledgeArticle = async (id: number) => unwrap<KnowledgeArticle>(await api.get(`/productivity/knowledge/articles/${id}`));
export const createKnowledgeArticle = async (payload: { spaceId: number; slug: string; title: string; content: KnowledgeBlock[]; summary?: string }) => unwrap<KnowledgeArticle>(await api.post('/productivity/knowledge/articles', payload));
export const reviseKnowledgeArticle = async (id: number, payload: { title?: string; content: KnowledgeBlock[]; summary?: string }) => unwrap<KnowledgeArticle>(await api.post(`/productivity/knowledge/articles/${id}/revisions`, payload));
export const setKnowledgeArticleStatus = async (id: number, status: KnowledgeArticle['status']) => unwrap<KnowledgeArticle>(await api.patch(`/productivity/knowledge/articles/${id}/status`, { status }));

export const getSignatureRequests = async () => unwrap<SignatureRequest[]>(await api.get('/productivity/sign/requests'));
export const createSignatureRequest = async (payload: {
  documentId: number; subject: string; message?: string; expiresAt?: string | null;
  recipients: Array<{ type?: 'external' | 'user'; userId?: number; name?: string; email?: string; signingOrder?: number }>;
}) => unwrap<SignatureRequest>(await api.post('/productivity/sign/requests', payload));
export const cancelSignatureRequest = async (id: number) => unwrap<SignatureRequest>(await api.patch(`/productivity/sign/requests/${id}/cancel`));

export const getPublicSignatureRequest = async (token: string) => unwrap<PublicSignatureRequest>(await api.get('/productivity/sign/public/request', { headers: signHeaders(token) }));
export const downloadPublicSignatureDocument = async (token: string) => api.get('/productivity/sign/public/document', { headers: signHeaders(token), responseType: 'blob' });
export const signPublicSignatureRequest = async (token: string, payload: { signatureName: string; consentAccepted: boolean }) => unwrap<{ status: string; signed_at: string; evidence_hash: string }>(await api.post('/productivity/sign/public/sign', payload, { headers: signHeaders(token) }));
export const declinePublicSignatureRequest = async (token: string) => unwrap<{ status: string; declined_at?: string | null }>(await api.post('/productivity/sign/public/decline', undefined, { headers: signHeaders(token) }));
