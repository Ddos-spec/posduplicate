import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const migration = read('backend/prisma/migrations/20260813090000_p3_website_commerce_core/migration.sql');
const controller = read('backend/src/modules/fnb/controllers/digital-website.p3.controller.ts');
const routes = read('backend/src/modules/fnb/routes/digital.routes.ts');
const capabilities = read('backend/src/middlewares/capability.middleware.ts');
const runtime = read('.github/workflows/p1-runtime-ci.yml');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const verifier = read('backend/src/scripts/verify-p3-database.ts');

describe('P3.1 Website/CMS + storefront catalog contract', () => {
  test('catalog projects the existing item source of truth with tenant isolation through outlet ownership', () => {
    expect(migration).toContain('item_id INTEGER NOT NULL REFERENCES public.items(id)');
    expect(controller).toContain('JOIN public.outlets o ON o.id=i.outlet_id');
    expect(controller).toContain('o.tenant_id=c.tenant_id');
    expect(controller).toContain('COALESCE(c.web_price,i.price) AS price');
  });
  test('public storefront resolves only published globally unique slugs', () => {
    expect(migration).toContain('ux_website_site_public_slug');
    expect(routes.indexOf("router.get('/storefront/:publicSlug', getPublicStorefront)")).toBeLessThan(routes.indexOf('router.use(authMiddleware, tenantMiddleware)'));
    expect(controller).toContain("status='published' LIMIT 1");
    expect(controller).toContain("s.status='published' AND c.is_published=TRUE");
  });
  test('CMS storage is strict declarative JSON rather than raw markup', () => {
    expect(controller).toContain('BLOCK_TYPES');
    expect(controller).toContain('CMS_RAW_MARKUP_REJECTED');
    expect(controller).toContain('CMS_URL_REJECTED');
    expect(controller).toContain('INVALID_CMS_BLOCK_TYPE');
  });
  test('admin lifecycle is capability gated and row locked', () => {
    for (const capability of ['digital.website.read','digital.website.manage','digital.commerce.read','digital.commerce.manage']) expect(capabilities).toContain(`'${capability}'`);
    expect(routes).toContain("requireCapability('digital.website.manage')");
    expect(routes).toContain("requireCapability('digital.commerce.manage')");
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('WEBSITE_SITE_CONCURRENT_UPDATE');
    expect(controller).toContain('WEBSITE_PAGE_CONCURRENT_UPDATE');
  });
  test('P3 migration has checksum, idempotency and runtime database verification', () => {
    expect(runner).toContain('p3_schema_migrations');
    expect(runner).toContain('checksum drift');
    expect(runner).toContain('already applied');
    expect(verifier).toContain('Storefront catalog must reuse public.items');
    expect(runtime).toContain('node dist/scripts/apply-p3-migrations.js');
    expect(runtime).toContain('node dist/scripts/verify-p3-database.js');
  });
});
