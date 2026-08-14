import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const publicMigration = read('backend/prisma/migrations/20260813252000_p3_learning_community_public_access/migration.sql');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const server = read('backend/src/server.ts');
const routes = read('backend/src/modules/learning/routes/learningCommunity.p3.routes.ts');
const learner = read('backend/src/modules/learning/services/learningPublic.p3.service.ts');
const learning = read('backend/src/modules/learning/services/learning.p3.service.ts');
const communityPublic = read('backend/src/modules/learning/services/communityPublic.p3.service.ts');
const frontendService = read('frontend/src/services/learningCommunityService.ts');
const learnerPage = read('frontend/src/pages/learning/PublicLearnerPage.tsx');
const communityPage = read('frontend/src/pages/learning/PublicCommunityPage.tsx');
const app = read('frontend/src/App.tsx');

describe('P3.7 learning/community public runtime contracts', () => {
  test('public access migration stores learner and community retry secrets hash-only', () => {
    expect(publicMigration).toContain('access_token_hash CHAR(64)');
    expect(publicMigration).toContain('submission_key_hash CHAR(64)');
    expect(publicMigration).toContain('ux_learning_enrollment_access_token');
    expect(publicMigration).toContain('ux_community_topic_submission_key');
    expect(publicMigration).toContain('ux_community_reply_submission_key');
    expect(runner).toContain('20260813252000_p3_learning_community_public_access');
  });

  test('public routes precede auth and mutation surfaces are rate limited', () => {
    const publicAt = routes.indexOf("router.get('/public/:publicSlug/courses'");
    const authAt = routes.indexOf('router.use(authMiddleware)');
    expect(publicAt).toBeGreaterThanOrEqual(0);
    expect(authAt).toBeGreaterThan(publicAt);
    expect(routes).toContain('learnerWriteLimiter');
    expect(routes).toContain('communityWriteLimiter');
    expect(routes).toContain('PUBLIC_LEARNING_RATE_LIMITED');
    expect(routes).toContain('PUBLIC_COMMUNITY_RATE_LIMITED');
  });

  test('learner bearer stays out of API paths and correct answers stay server-side', () => {
    expect(routes).not.toContain('/public/learner/:token');
    expect(frontendService).toContain("'X-Learning-Token': token");
    expect(server).toContain("'X-Learning-Token'");
    expect(learner).toContain("crypto.createHash('sha256')");
    expect(learner).toContain('access_token_hash=${tokenHash}');
    const assessmentProjection = learner.slice(learner.indexOf('SELECT a.id,a.lesson_id'), learner.indexOf('FROM public.learning_assessments a'));
    expect(assessmentProjection).not.toContain('correct_answer');
    expect(learning).toContain('question.correct_answer');
  });

  test('learner invite bearer is URL-fragment only and removed after memory capture', () => {
    const dynamicAt = app.indexOf('<Route path="/learn/:publicSlug"');
    const entryAt = app.indexOf('<Route path="/learn/entry"');
    expect(entryAt).toBeGreaterThanOrEqual(0);
    expect(dynamicAt).toBeGreaterThan(entryAt);
    expect(learnerPage).toContain("window.location.hash.replace(/^#/, '')");
    expect(learnerPage).toContain("window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)");
    expect(learnerPage).not.toContain('useParams');
  });

  test('community retry bearer is header-only and public payload never accepts customerId', () => {
    expect(frontendService).toContain("'X-Community-Token': token");
    expect(server).toContain("'X-Community-Token'");
    expect(communityPublic).toContain("crypto.createHash('sha256')");
    expect(communityPublic).toContain('submission_key_hash=${hash}');
    expect(communityPublic).not.toContain('input.customerId');
    expect(communityPage).toContain('sessionStorage.setItem(key, token)');
    expect(communityPage).toContain('sessionStorage.removeItem(payloadKey)');
  });

  test('public and admin frontend routes preserve entitlement boundaries', () => {
    expect(app).toContain('<Route path="/learn/:publicSlug" element={<PublicLearningPage />} />');
    expect(app).toContain('<Route path="/community/:publicSlug" element={<PublicCommunityPage />} />');
    expect(app).toContain('<Route path="/learning" element={<TenantModuleRoute moduleKey="commerSocial"><ProtectedRoute><LearningCommunityWorkspacePage /></ProtectedRoute></TenantModuleRoute>} />');
  });

  test('assessment retries and certificate materialization are idempotent in server service', () => {
    expect(learning).toContain("if (attempt.status !== 'in_progress') return attempt");
    expect(learning).toContain('ON CONFLICT (tenant_id,enrollment_id) DO NOTHING');
    expect(learning).toContain("status='completed'");
    expect(learning).toContain("crypto.createHash('sha256')");
  });
});
