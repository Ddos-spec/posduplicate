import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const migration = read('backend/prisma/migrations/20260813090000_p3_website_commerce_core/migration.sql');
const reservationMigration = read('backend/prisma/migrations/20260813101000_p3_ecommerce_reservation_snapshot/migration.sql');
const controller = read('backend/src/modules/fnb/controllers/digital-website.p3.controller.ts');
const routes = read('backend/src/modules/fnb/routes/digital.routes.ts');
const capabilities = read('backend/src/middlewares/capability.middleware.ts');
const runtime = read('.github/workflows/p1-runtime-ci.yml');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const verifier = read('backend/src/scripts/verify-p3-database.ts');
const reservationService = read('backend/src/modules/fnb/services/ecommerce-reservation.p3.service.ts');
const reservationV2Service = read('backend/src/modules/fnb/services/ecommerce-reservation-v2.p3.service.ts');
const orderWriteService = read('backend/src/modules/fnb/services/ecommerce-order-write.p3.service.ts');
const catalogLockService = read('backend/src/modules/fnb/services/ecommerce-catalog-lock.p3.service.ts');
const ecommerceCreateController = read('backend/src/modules/fnb/controllers/ecommerce-create.p3.controller.ts');
const transitionService = read('backend/src/modules/fnb/services/ecommerce-transition.p3.service.ts');
const app = read('frontend/src/App.tsx');
const frontendService = read('frontend/src/services/digitalWebsiteService.ts');
const workspace = read('frontend/src/pages/DigitalWebsiteWorkspacePage.tsx');
const storefront = read('frontend/src/pages/StorefrontPage.tsx');
const orderManager = read('frontend/src/pages/digital/EcommerceOrderManager.tsx');
const frontendApi = read('frontend/src/services/api.ts');
const server = read('backend/src/server.ts');
const suiteCatalog = read('frontend/src/config/suiteCatalog.ts');

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
    expect(workspace).not.toContain('dangerouslySetInnerHTML');
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
  test('frontend workspace is tenant-owner gated and uses the P3 API contract', () => {
    expect(app).toContain('path="/digital"');
    expect(app).toContain('moduleKey="commerSocial"');
    expect(app).toContain('<OwnerRoute><DigitalWebsiteWorkspacePage /></OwnerRoute>');
    expect(frontendService).toContain("api.get('/digital/sites')");
    expect(frontendService).toContain('/digital/storefront/');
    expect(workspace).toContain('SiteManager');
    expect(workspace).toContain('PageManager');
    expect(workspace).toContain('CatalogManager');
  });
  test('suite metadata keeps website partial and promotes accepted ecommerce runtime', () => {
    const website = suiteCatalog.split('\n').find((line) => line.includes("{ id: 'website'"));
    const ecommerce = suiteCatalog.split('\n').find((line) => line.includes("{ id: 'ecommerce'"));
    expect(website).toContain("status: 'partial'");
    expect(website).toContain("path: '/digital'");
    expect(ecommerce).toContain("status: 'live'");
    expect(ecommerce).toContain("bundle: 'commerSocial'");
    expect(ecommerce).toContain("path: '/digital'");
  });
});

describe('P3.2 eCommerce order integrity and cancellation hardening', () => {
  test('public checkout uses the canonical V2 reservation path', () => {
    expect(ecommerceCreateController).toContain('reserveGuestOrderV2({');
    expect(reservationService).toContain('reserveGuestOrderV2 as reserveGuestOrder');
  });
  test('reservation persists exact stock snapshot independently of track_stock configuration', () => {
    expect(reservationMigration).toContain('reserved_stock_quantity NUMERIC(15,3) NOT NULL DEFAULT 0');
    expect(reservationMigration).toContain('CHECK (reserved_stock_quantity >= 0 AND reserved_stock_quantity <= quantity)');
    expect(reservationV2Service).toContain('const reservedStock = item.track_stock ? requested.quantity : 0');
    expect(orderWriteService).toContain('reserved_stock_quantity)');
  });
  test('checkout retry idempotency is checked before catalog or inventory mutation', () => {
    expect(ecommerceCreateController).toContain('normalizeCheckoutToken');
    expect(ecommerceCreateController).toContain("req.header('x-order-token')");
    expect(ecommerceCreateController).toContain('data.reused ? 200 : 201');
    expect(reservationV2Service).toContain('findGuestOrderByTokenHash(tx, tokenHash)');
    expect(reservationV2Service.indexOf('findGuestOrderByTokenHash(tx, tokenHash)')).toBeLessThan(reservationV2Service.indexOf('const item = await lockPublishedCatalogItem'));
    expect(reservationV2Service).toContain('CHECKOUT_TOKEN_REUSED');
    expect(orderWriteService).toContain('WHERE public_token_hash=${tokenHash}');
    expect(frontendService).toContain("'x-order-token': token");
    expect(storefront).toContain('p3-storefront-checkout-attempt');
    expect(storefront).toContain('newCheckoutToken');
    expect(storefront).toContain('fingerprint');
    expect(storefront).toContain('sessionStorage.removeItem(attemptKey)');
  });
  test('cancellation accepts active non-terminal states and rejects completed orders', () => {
    expect(transitionService).toContain("reserved: ['confirmed', 'cancelled']");
    expect(transitionService).toContain("confirmed: ['preparing', 'cancelled']");
    expect(transitionService).toContain("preparing: ['ready', 'cancelled']");
    expect(transitionService).toContain("ready: ['completed', 'cancelled']");
    expect(transitionService).toContain("completed: []");
  });
  test('cancellation restores stock from persisted snapshot, not mutable track_stock flag', () => {
    expect(transitionService).toContain('reserved_stock_quantity > 0');
    expect(transitionService).toContain('SUM(reserved_stock_quantity) as total_reserved');
    expect(transitionService).toContain('stock = stock + ${Number(row.total_reserved)}');
  });
  test('cancellation is idempotent and concurrency-safe with row locking', () => {
    expect(transitionService).toContain('FOR UPDATE');
    expect(transitionService).toContain("if (order.status === 'cancelled' && target === 'cancelled') return order");
    expect(transitionService).toContain('ECOMMERCE_ORDER_CONCURRENT_UPDATE');
  });
  test('cancellation sets timestamp and appends single lifecycle event with actor', () => {
    expect(transitionService).toContain("cancelled_at=CASE WHEN ${target}='cancelled' THEN NOW() ELSE cancelled_at END");
    expect(transitionService).toContain("'status_changed'");
    expect(transitionService).toContain('actor_user_id');
  });
  test('cancellation aggregates duplicate item lines and scopes to tenant/outlet', () => {
    expect(transitionService).toContain('GROUP BY item_id');
    expect(transitionService).toContain('tenant_id=${tenantId}');
    expect(transitionService).toContain('outlet_id=${order.outlet_id}');
  });
  test('cancellation is capability-gated and routed through manager workflow', () => {
    expect(routes).toContain("requireCapability('digital.commerce.manage')");
    expect(routes).toContain("router.patch('/orders/:id/status'");
  });
  test('public catalog is scoped to the site fulfillment outlet only', () => {
    expect(controller).toContain('AND i.outlet_id=s.fulfillment_outlet_id');
    expect(catalogLockService).toContain('COALESCE(i.is_active,TRUE)=TRUE');
  });
  test('public browser runtime covers catalog, cart, checkout and status without auth redirect', () => {
    expect(app).toContain('<Route path="/store/:publicSlug" element={<StorefrontPage />} />');
    expect(app.indexOf('<Route path="/store/:publicSlug"')).toBeLessThan(app.indexOf('<Route path="/module-selector"'));
    expect(storefront).toContain('createPublicStorefrontOrder');
    expect(storefront).toContain('getPublicStorefrontOrderStatus');
    expect(storefront).toContain('sessionStorage');
    expect(frontendService).toContain("'x-order-token': token");
    expect(server).toContain("'X-Order-Token'");
    expect(frontendApi).toContain('isPublicStorefrontRequest');
    expect(frontendApi).toContain('!isPublicStorefrontRequest');
  });
  test('merchant runtime exposes the finite-state ecommerce order queue', () => {
    expect(workspace).toContain('EcommerceOrderManager');
    expect(orderManager).toContain('getEcommerceOrders');
    expect(orderManager).toContain('progressEcommerceOrder');
    expect(orderManager).toContain("ready: ['completed', 'cancelled']");
  });
});