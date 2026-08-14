import path from 'path';
import { matchesDeclaredFileType } from '../../src/utils/fileSecurity';
import { resolvePathWithin } from '../../src/utils/pathSecurity';
import { decrypt, encrypt } from '../../src/utils/crypto';
import { validatePrivateDocumentUpload } from '../../src/modules/productivity/services/privateDocumentStorage.p3';

describe('security foundation utilities', () => {
  test('path containment accepts a child and rejects parent or absolute escapes', () => {
    const root = path.resolve('private-test-root');
    expect(resolvePathWithin(root, 'tenant-1', 'asset.bin')).toBe(
      path.resolve(root, 'tenant-1', 'asset.bin'),
    );
    expect(() => resolvePathWithin(root, '..', 'outside.bin')).toThrow(/outside the permitted storage root/);
    expect(() => resolvePathWithin(root, path.parse(root).root, 'outside.bin')).toThrow(/outside the permitted storage root/);
  });

  test('file signatures must match their multipart MIME declaration', () => {
    expect(matchesDeclaredFileType(Buffer.from('%PDF-1.7\n'), 'application/pdf')).toBe(true);
    expect(matchesDeclaredFileType(Buffer.from('<script>alert(1)</script>'), 'application/pdf')).toBe(false);
    expect(matchesDeclaredFileType(Buffer.from([0xff, 0xd8, 0xff, 0xdb]), 'image/jpeg')).toBe(true);
    expect(matchesDeclaredFileType(Buffer.from([0x50, 0x4b, 0x03, 0x04]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
  });

  test('private document validation rejects a forged content type', () => {
    expect(() => validatePrivateDocumentUpload({
      buffer: Buffer.from('<html>not a PDF</html>'),
      mimetype: 'application/pdf',
      originalname: 'invoice.pdf',
    } as Express.Multer.File)).toThrow(expect.objectContaining({ code: 'DOCUMENT_FILE_SIGNATURE_MISMATCH' }));
  });

  test('AES-GCM round-trips and rejects modified authentication data', () => {
    const ciphertext = encrypt({ tenantId: 7, token: 'secret' });
    expect(decrypt(ciphertext)).toEqual({ tenantId: 7, token: 'secret' });

    const tampered = Buffer.from(ciphertext, 'base64');
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => decrypt(tampered.toString('base64'))).toThrow('Failed to decrypt data');
    expect(() => decrypt(Buffer.from('short').toString('base64'))).toThrow('Failed to decrypt data');
  });
});
