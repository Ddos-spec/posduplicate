import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const migration = read('backend/prisma/migrations/20260813230000_p3_marketing_engagement_core/migration.sql');
const idempotencyMigration = read('backend/prisma/migrations/20260813231000_p3_marketing_public_idempotency/migration.sql');
const capabilities = read('backend/src/middlewares/capability.middleware.ts');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const verifier = read('backend/src/scripts/verify-p3-database.ts');
const server = read('backend/src/server.ts');
const eventService = read('backend/src/modules/medsos/services/marketingEvent.p3.service.ts');
const surveyService = read('backend/src/modules/medsos/services/marketingSurvey.p3.service.ts');
const journeyService = read('backend/src/modules/medsos/services/marketingJourney.p3.service.ts');
const publicService = read('backend/src/modules/medsos/services/marketingEngagementPublic.p3.service.ts');
const publicController = read('backend/src/modules/medsos/controllers/marketingEngagementPublic.p3.controller.ts');
const routes = read('backend/src/modules/medsos/routes/marketingEngagement.p3.routes.ts');
const moduleIndex = read('backend/src/modules/medsos/index.ts');
const app = read('frontend/src/App.tsx');
const automationPage = read('frontend/src/pages/medsos/AutoReplyPage.tsx');
const storefront = read('frontend/src/pages/StorefrontPage.tsx');
const publicPanel = read('frontend/src/components/marketing/PublicEngagementPanel.tsx');
const frontendService = read('frontend/src/services/marketingEngagementService.ts');
const catalog = read('frontend/src/config/suiteCatalog.ts');

const catalogLine = (appId: string) => catalog.split('\n').find((line) => line.includes(`{ id: '${appId}'`));

describe('P3.5 marketing engagement contracts', () => {
  test('reuses customer master and keeps lifecycle audit append-only', () => {
    expect(migration).toContain('REFERENCES public.customers(id)');
    expect(migration).toContain('trg_marketing_engagement_events_immutable');
    expect(migration).not.toContain('CREATE TABLE IF NOT EXISTS public.marketing_customers');
  });

  test('event capacity is serialized on the event row before occupied-seat calculation', () => {
    const registerBlock = eventService.slice(eventService.indexOf('export const registerMarketingEvent'));
    const lockAt = registerBlock.indexOf('FOR UPDATE');
    const capacityAt = registerBlock.indexOf('SELECT COALESCE(SUM(seats),0)::bigint AS occupied');
    expect(lockAt).toBeGreaterThanOrEqual(0);
    expect(capacityAt).toBeGreaterThan(lockAt);
    expect(registerBlock).toContain("status IN ('registered','checked_in')");
  });

  test('survey submission validates survey ownership and answer contracts before response materialization', () => {
    expect(surveyService).toContain('SURVEY_QUESTION_SCOPE_MISMATCH');
    expect(surveyService).toContain('SURVEY_REQUIRED_ANSWER_MISSING');
    expect(surveyService).toContain("type === 'rating'");
    expect(surveyService).toContain("type === 'nps'");
    expect(surveyService.indexOf('const normalizedAnswers')).toBeLessThan(surveyService.indexOf('INSERT INTO public.marketing_survey_responses'));
  });

  test('admin API is authenticated, tenant scoped, and capability gated', () => {
    expect(capabilities).toContain("'digital.marketing.read'");
    expect(capabilities).toContain("'digital.marketing.manage'");
    expect(routes).toContain('router.use(authMiddleware)');
    expect(routes).toContain('router.use(tenantMiddleware)');
    expect(routes).toContain("requireCapability('digital.marketing.manage')");
    expect(moduleIndex).toContain("router.use('/engagement', marketingEngagementRoutes)");
  });

  test('public participation is rate limited, precedes auth, and resolves tenant via published website slug', () => {
    const publicRouteAt = routes.indexOf("router.get('/public/:publicSlug/events/:eventSlug'");
    const authAt = routes.indexOf('router.use(authMiddleware)');
    expect(publicRouteAt).toBeGreaterThanOrEqual(0);
    expect(authAt).toBeGreaterThan(publicRouteAt);
    expect(routes).toContain('publicWriteLimiter');
    expect(routes).toContain('PUBLIC_ENGAGEMENT_RATE_LIMITED');
    expect(publicService).toContain('FROM public.website_sites');
    expect(publicService).toContain("status='published'");
    expect(publicService).not.toContain('input.customerId');
  });

  test('public write retries use opaque token hashes and partial unique indexes', () => {
    expect(idempotencyMigration).toContain('ux_marketing_event_registration_submission_key');
    expect(idempotencyMigration).toContain('ux_marketing_survey_response_submission_key');
    expect(idempotencyMigration).toContain('submission_key_hash CHAR(64)');
    expect(runner).toContain('20260813231000_p3_marketing_public_idempotency');
    expect(publicController).toContain("req.header('x-engagement-token')");
    expect(publicService).toContain("crypto.createHash('sha256')");
    expect(eventService).toContain('AND submission_key_hash=${submissionKeyHash}');
    expect(surveyService).toContain('AND submission_key_hash=${submissionKeyHash}');
    expect(server).toContain("'X-Engagement-Token'");
    expect(frontendService).toContain("'X-Engagement-Token': token");
    expect(publicPanel).toContain('sessionStorage.setItem(key');
  });

  test('public storefront renders engagement without exposing a separate unauthenticated router', () => {
    expect(storefront).toContain("searchParams.get('event')");
    expect(storefront).toContain("searchParams.get('survey')");
    expect(storefront).toContain('<PublicEngagementPanel');
    expect(publicPanel).toContain('registerPublicMarketingEvent');
    expect(publicPanel).toContain('submitPublicMarketingSurvey');
  });

  test('journey lifecycle is declarative and cannot silently call external delivery', () => {
    expect(journeyService).toContain("draft: ['active', 'archived']");
    expect(journeyService).toContain("['wait','broadcast','tag','notify']");
    expect(journeyService).not.toContain('createZernioBroadcast');
    expect(journeyService).not.toContain('createZernioAutomation');
    expect(journeyService).not.toContain('axios');
  });

  test('migration runner and DB verifier cover P3.5 core', () => {
    expect(runner).toContain('20260813230000_p3_marketing_engagement_core');
    expect(verifier).toContain('P3.5 marketing engagement tables are incomplete');
    expect(verifier).toContain('trg_marketing_engagement_events_immutable');
  });

  test('accepted Events and Surveys are live on the existing commerce-social automation runtime', () => {
    const automation = catalogLine('marketing-automation');
    const events = catalogLine('events');
    const surveys = catalogLine('surveys');

    expect(automation).toContain("bundle: 'commerSocial'");
    expect(automation).toContain("status: 'partial'");
    expect(automation).toContain("path: '/medsos/automations'");

    for (const line of [events, surveys]) {
      expect(line).toContain("bundle: 'commerSocial'");
      expect(line).toContain("status: 'live'");
      expect(line).toContain("path: '/medsos/automations?view=engagement'");
    }

    expect(app).toContain('path="automations" element={<AutoReplyPage />}');
    expect(app).toContain('moduleKey="commerSocial"');
    expect(automationPage).toContain("view: 'engagement'");
    expect(automationPage).toContain('<MarketingEngagementPage />');
    expect(catalogLine('sms-marketing')).toContain("status: 'blueprint'");
  });
});
