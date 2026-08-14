import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const coreMigration = read('backend/prisma/migrations/20260813240000_p3_productivity_docs_knowledge_sign_core/migration.sql');
const guardMigration = read('backend/prisma/migrations/20260813241000_p3_productivity_sign_version_guard/migration.sql');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const verifier = read('backend/src/scripts/verify-p3-database.ts');
const capabilities = read('backend/src/middlewares/capability.middleware.ts');
const server = read('backend/src/server.ts');
const routes = read('backend/src/modules/productivity/routes/productivity.p3.routes.ts');
const storage = read('backend/src/modules/productivity/services/privateDocumentStorage.p3.ts');
const documents = read('backend/src/modules/productivity/services/document.p3.service.ts');
const knowledge = read('backend/src/modules/productivity/services/knowledge.p3.service.ts');
const sign = read('backend/src/modules/productivity/services/sign.p3.service.ts');
const catalog = read('frontend/src/config/suiteCatalog.ts');

const catalogLine = (appId: string) => catalog.split('\n').find((line) => line.includes(`{ id: '${appId}'`));

describe('P3.6 productivity contracts', () => {
  test('private document bytes are never mounted under public static uploads', () => {
    expect(storage).toContain("private_uploads");
    expect(storage).toContain("path.join(root, 'documents')");
    expect(storage).toContain("mode: 0o600");
    expect(storage).toContain("flag: 'wx'");
    expect(server).toContain("app.use('/uploads', express.static");
    expect(server).not.toContain("app.use('/private_uploads'");
    expect(server).not.toContain("express.static(path.join(process.cwd(), 'private_uploads'))");
  });

  test('document and knowledge versions plus productivity audit are append-only', () => {
    expect(coreMigration).toContain('trg_business_document_versions_immutable');
    expect(coreMigration).toContain('trg_knowledge_article_versions_immutable');
    expect(coreMigration).toContain('trg_productivity_events_immutable');
    expect(documents).toContain('sha256');
    expect(documents).toContain('current_version');
    expect(knowledge).toContain('version = Number(article.current_version) + 1');
  });

  test('knowledge content is declarative and rejects executable/raw-html content before write', () => {
    expect(knowledge).toContain('Knowledge content must be an array of declarative blocks');
    expect(knowledge).toContain('/[<>]/.test(json)');
    expect(knowledge).toContain('/javascript:/i.test(json)');
    expect(knowledge).toContain("'UNSAFE_KNOWLEDGE_CONTENT'");
  });

  test('signature request is pinned by database FK to the exact tenant/document/version tuple', () => {
    expect(coreMigration).toContain('document_version_id BIGINT NOT NULL REFERENCES public.business_document_versions(id)');
    expect(guardMigration).toContain('fk_signature_request_exact_document_version');
    expect(guardMigration).toContain('FOREIGN KEY (tenant_id,document_version_id,document_id)');
    expect(guardMigration).toContain('REFERENCES public.business_document_versions(tenant_id,id,document_id)');
    expect(verifier).toContain('Signature request must be pinned by FK to exact tenant/document/version tuple');
  });

  test('signing tokens are opaque/hash-only and typed evidence binds exact version identity', () => {
    expect(coreMigration).toContain('access_token_hash CHAR(64) NOT NULL');
    expect(coreMigration).toContain('signature_evidence_hash CHAR(64)');
    expect(sign).toContain("crypto.createHash('sha256').update(token).digest('hex')");
    expect(sign).toContain('String(recipient.document_sha256)');
    expect(sign).toContain('CONSENT_TEXT');
    expect(sign).toContain("signature_type='typed'");
    expect(sign).toContain("if (recipient.status === 'signed') return");
  });

  test('ordered signing and active-request lifecycle are server enforced', () => {
    expect(sign).toContain('signing_order < ${Number(recipient.signing_order)}');
    expect(sign).toContain("status <> 'signed'");
    expect(sign).toContain("recipient.request_status !== 'sent'");
    expect(sign).toContain("status='completed'");
  });

  test('public sign writes are rate limited and precede authenticated tenant admin routes', () => {
    const publicAt = routes.indexOf("router.get('/sign/public/:token'");
    const authAt = routes.indexOf('router.use(authMiddleware)');
    expect(publicAt).toBeGreaterThanOrEqual(0);
    expect(authAt).toBeGreaterThan(publicAt);
    expect(routes).toContain('signWriteLimiter');
    expect(routes).toContain('PUBLIC_SIGN_RATE_LIMITED');
  });

  test('admin productivity routes are capability gated and mounted under dedicated API namespace', () => {
    for (const capability of [
      'productivity.documents.read','productivity.documents.manage',
      'productivity.knowledge.read','productivity.knowledge.manage',
      'productivity.sign.read','productivity.sign.manage',
    ]) expect(capabilities).toContain(`'${capability}'`);
    expect(routes).toContain("requireCapability('productivity.documents.manage')");
    expect(routes).toContain("requireCapability('productivity.knowledge.manage')");
    expect(routes).toContain("requireCapability('productivity.sign.manage')");
    expect(server).toContain("apiRouter.use('/api/productivity', productivityRoutes)");
  });

  test('P3 runner and canonical verifier cover both productivity migrations and ten core tables', () => {
    expect(runner).toContain('20260813240000_p3_productivity_docs_knowledge_sign_core');
    expect(runner).toContain('20260813241000_p3_productivity_sign_version_guard');
    expect(verifier).toContain('P3.6 productivity tables are incomplete');
    expect(verifier).toContain('productivityTables.rows.length === 10');
    expect(verifier).toContain('trg_business_document_versions_immutable');
    expect(verifier).toContain('fk_signature_request_exact_document_version');
  });

  test('catalog remains conservative until frontend routes and exact-head acceptance are complete', () => {
    expect(catalogLine('documents')).toContain("status: 'partial'");
    expect(catalogLine('knowledge')).toContain("status: 'blueprint'");
    expect(catalogLine('sign')).toContain("status: 'blueprint'");
  });
});
