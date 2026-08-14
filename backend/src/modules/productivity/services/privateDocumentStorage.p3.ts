import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { matchesDeclaredFileType } from '../../../utils/fileSecurity';

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const root = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), 'private_uploads'));
const documentRoot = path.join(root, 'documents');

const domainError = (message: string, code: string, status = 400) => Object.assign(new Error(message), { code, status });

export const validatePrivateDocumentUpload = (file: Express.Multer.File) => {
  if (!file?.buffer?.length) throw domainError('Document file is required', 'DOCUMENT_FILE_REQUIRED');
  if (file.buffer.length > MAX_DOCUMENT_BYTES) throw domainError('Document file exceeds 25 MB limit', 'DOCUMENT_FILE_TOO_LARGE', 413);
  if (!ALLOWED_MIME.has(String(file.mimetype || '').toLowerCase())) throw domainError('Unsupported document file type', 'UNSUPPORTED_DOCUMENT_FILE_TYPE', 415);
  if (!matchesDeclaredFileType(file.buffer, file.mimetype)) throw domainError('Document bytes do not match the declared file type', 'DOCUMENT_FILE_SIGNATURE_MISMATCH', 415);
  const originalName = String(file.originalname || 'document').replace(/[\r\n\0]/g, '').trim().slice(0, 255);
  if (!originalName) throw domainError('Invalid document filename', 'INVALID_DOCUMENT_FILENAME');
  return {
    originalName,
    mimeType: String(file.mimetype).toLowerCase(),
    sizeBytes: file.buffer.length,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    buffer: file.buffer,
  };
};

export const buildPrivateStorageKey = (tenantId: number, documentId: number, versionNo: number) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  return path.posix.join(String(tenantId), String(documentId), `v${versionNo}-${nonce}.bin`);
};

const resolveStoragePath = (storageKey: string) => {
  const normalized = String(storageKey || '').replace(/\\/g, '/');
  if (!/^[0-9]+\/[0-9]+\/v[0-9]+-[0-9a-f]{32}\.bin$/.test(normalized)) {
    throw domainError('Invalid private storage key', 'INVALID_PRIVATE_STORAGE_KEY', 500);
  }
  const absolute = path.resolve(documentRoot, normalized);
  const prefix = `${path.resolve(documentRoot)}${path.sep}`;
  if (!absolute.startsWith(prefix)) throw domainError('Invalid private storage path', 'INVALID_PRIVATE_STORAGE_KEY', 500);
  return absolute;
};

export const writePrivateDocument = async (storageKey: string, buffer: Buffer) => {
  const absolute = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer, { flag: 'wx', mode: 0o600 });
  return absolute;
};

export const readPrivateDocument = async (storageKey: string) => fs.readFile(resolveStoragePath(storageKey));

export const deletePrivateDocument = async (storageKey: string) => {
  try { await fs.unlink(resolveStoragePath(storageKey)); } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
};
