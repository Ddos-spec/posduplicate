const queryRaw = jest.fn();
const executeRaw = jest.fn();
const transaction = jest.fn(async (callback: (client: any) => unknown) => callback({ $queryRaw: queryRaw, $executeRaw: executeRaw }));

const validatePrivateDocumentUpload = jest.fn();
const buildPrivateStorageKey = jest.fn();
const writePrivateDocument = jest.fn();
const readPrivateDocument = jest.fn();
const deletePrivateDocument = jest.fn();

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: transaction,
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock('../../src/modules/productivity/services/privateDocumentStorage.p3', () => ({
  validatePrivateDocumentUpload,
  buildPrivateStorageKey,
  writePrivateDocument,
  readPrivateDocument,
  deletePrivateDocument,
}));

import { addDocumentVersion } from '../../src/modules/productivity/services/document.p3.service';
import { createKnowledgeArticle } from '../../src/modules/productivity/services/knowledge.p3.service';
import { signPublicSignatureRequest } from '../../src/modules/productivity/services/sign.p3.service';

beforeEach(() => {
  queryRaw.mockReset();
  executeRaw.mockReset();
  transaction.mockClear();
  validatePrivateDocumentUpload.mockReset();
  buildPrivateStorageKey.mockReset();
  writePrivateDocument.mockReset();
  readPrivateDocument.mockReset();
  deletePrivateDocument.mockReset();
});

describe('P3.6 productivity behavioral invariants', () => {
  test('same document SHA returns the existing immutable version without writing another file', async () => {
    validatePrivateDocumentUpload.mockReturnValue({
      originalName: 'same.pdf', mimeType: 'application/pdf', sizeBytes: 3, sha256: 'a'.repeat(64), buffer: Buffer.from('pdf'),
    });
    queryRaw
      .mockResolvedValueOnce([{ id: 11, tenant_id: 1, status: 'active', current_version: 2, owner_user_id: 7, created_by: 7 }])
      .mockResolvedValueOnce([{ id: 22, version_no: 2, original_name: 'same.pdf', mime_type: 'application/pdf', size_bytes: 3, sha256: 'a'.repeat(64) }]);

    const result = await addDocumentVersion(1, 7, 'owner', 11, { buffer: Buffer.from('pdf') } as any);

    expect(result).toMatchObject({ id: 22, version_no: 2 });
    expect(buildPrivateStorageKey).not.toHaveBeenCalled();
    expect(writePrivateDocument).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('unsafe knowledge content is rejected before any database transaction', async () => {
    await expect(createKnowledgeArticle(1, 7, {
      spaceId: 2,
      slug: 'unsafe',
      title: 'Unsafe',
      content: [{ type: 'paragraph', text: '<script>alert(1)</script>' }],
    })).rejects.toMatchObject({ code: 'UNSAFE_KNOWLEDGE_CONTENT' });

    expect(transaction).not.toHaveBeenCalled();
  });

  test('later signature recipient is blocked until earlier signing order is complete', async () => {
    queryRaw
      .mockResolvedValueOnce([{
        id: 20, tenant_id: 1, request_id: 5, request_status: 'sent', status: 'pending', signing_order: 2,
        recipient_email: 'later@example.com', document_sha256: 'd'.repeat(64), document_version_id: 9,
        expires_at: null,
      }])
      .mockResolvedValueOnce([{ count: 1n }]);

    await expect(signPublicSignatureRequest('c'.repeat(64), { signatureName: 'Later Signer', consentAccepted: true }))
      .rejects.toMatchObject({ code: 'SIGNATURE_ORDER_BLOCKED', status: 409 });

    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('signed recipient retry returns prior evidence without another update or audit event', async () => {
    const signedAt = new Date('2026-08-14T00:00:00.000Z');
    queryRaw.mockResolvedValueOnce([{
      id: 20, tenant_id: 1, request_id: 5, request_status: 'completed', status: 'signed', signing_order: 1,
      recipient_email: 'done@example.com', document_sha256: 'd'.repeat(64), document_version_id: 9,
      signed_at: signedAt, signature_evidence_hash: 'e'.repeat(64), expires_at: null,
    }]);

    await expect(signPublicSignatureRequest('f'.repeat(64), { signatureName: 'Done', consentAccepted: true }))
      .resolves.toEqual({ status: 'signed', signed_at: signedAt, evidence_hash: 'e'.repeat(64) });

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
