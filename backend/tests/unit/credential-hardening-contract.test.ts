import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('credential hardening contract', () => {
  test('admin bootstrap requires an injected strong password and never prints it', () => {
    const source = read('backend/src/scripts/create-admin-prisma.ts');
    expect(source).toContain('process.env.ADMIN_PASSWORD');
    expect(source).not.toContain("'admin123'");
    expect(source).not.toContain('Password: ${ADMIN_PASSWORD}');
  });

  test('login has no fallback signing secret and uses an explicit safe user projection', () => {
    const source = read('backend/src/modules/shared/controllers/auth.controller.ts');
    expect(source).toContain('requireJwtSecret()');
    expect(source).not.toContain('fallback-secret');
    expect(source).not.toContain('passwordHash, ...userWithoutPassword');
    expect(source).toContain('const userWithoutPassword = {');
  });

  test('temporary credentials use cryptographic randomness and never enter logs', () => {
    const source = read('backend/src/modules/accounting/controllers/accounting.user.controller.ts');
    expect(source).toContain('randomBytes(12)');
    expect(source).not.toMatch(/console\.(log|info|warn)\([^\n]*tempPassword/);
    expect(source).toContain('emailSent: false');
  });

  test('Zernio raw body is retained only for signature verification', () => {
    const server = read('backend/src/server.ts');
    const routes = read('backend/src/modules/medsos/routes/zernio.routes.ts');
    const receipt = read('backend/src/modules/medsos/services/zernioWebhookReceipt.service.ts');
    expect(server).toContain("expressRequest.originalUrl.startsWith('/api/medsos/zernio/webhook')");
    expect(routes).toContain('verifyZernioWebhookSignature');
    expect(routes).toContain('processZernioWebhookReceipt');
    expect(routes).toContain("'Idempotency-Key': `zernio-${payload.id}`");
    expect(receipt).toContain('pg_advisory_xact_lock');
    expect(receipt).not.toContain('payload JSONB');
    expect(routes).not.toContain('TODO: Verify signature');
  });
});
