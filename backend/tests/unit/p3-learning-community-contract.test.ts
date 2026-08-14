import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const core = read('backend/prisma/migrations/20260813250000_p3_learning_community_core/migration.sql');
const guard = read('backend/prisma/migrations/20260813251000_p3_learning_community_scope_guard/migration.sql');
const customerGuard = read('backend/prisma/migrations/20260813253000_p3_learning_customer_scope_guard/migration.sql');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const verifier = read('backend/src/scripts/verify-p3-database.ts');
const capabilities = read('backend/src/middlewares/capability.middleware.ts');
const catalog = read('frontend/src/config/suiteCatalog.ts');

const catalogLine = (appId: string) => catalog.split('\n').find((line) => line.includes(`{ id: '${appId}'`));

describe('P3.7 learning and community contracts', () => {
  test('reuses website, customer and user sources of truth without parallel identity masters', () => {
    expect(core).toContain('REFERENCES public.website_sites(tenant_id, id)');
    expect(core).toContain('REFERENCES public.customers(id)');
    expect(core).toContain('REFERENCES public.users(id)');
    expect(core).not.toContain('CREATE TABLE IF NOT EXISTS public.learning_customers');
    expect(core).not.toContain('CREATE TABLE IF NOT EXISTS public.community_users');
    expect(core).not.toContain('CREATE TABLE IF NOT EXISTS public.learners');
  });

  test('learning scope is database constrained across course, enrollment, lesson and assessment', () => {
    expect(guard).toContain('ux_learning_lesson_tenant_course_id');
    expect(guard).toContain('ux_learning_assessment_tenant_course_id');
    expect(guard).toContain('ux_learning_enrollment_tenant_course_id');
    expect(guard).toContain('FOREIGN KEY (tenant_id, course_id, enrollment_id)');
    expect(guard).toContain('FOREIGN KEY (tenant_id, course_id, lesson_id)');
    expect(guard).toContain('FOREIGN KEY (tenant_id, course_id, assessment_id)');
    expect(guard).toContain('FOREIGN KEY (tenant_id, assessment_id, question_id)');
  });

  test('learning completion evidence and lifecycle audit ledgers are immutable', () => {
    expect(core).toContain('trg_learning_certificates_immutable');
    expect(core).toContain('trg_learning_events_immutable');
    expect(core).toContain('evidence_sha256 CHAR(64) NOT NULL');
  });

  test('community moderation audit is append-only and votes are one target per customer', () => {
    expect(core).toContain('trg_community_events_immutable');
    expect(core).toContain('community_vote_target_valid');
    expect(core).toContain('ux_community_vote_topic_customer');
    expect(core).toContain('ux_community_vote_reply_customer');
  });

  test('canonical runner and verifier include every P3.7 forward migration', () => {
    expect(runner).toContain('20260813250000_p3_learning_community_core');
    expect(runner).toContain('20260813251000_p3_learning_community_scope_guard');
    expect(runner).toContain('20260813252000_p3_learning_community_public_access');
    expect(runner).toContain('20260813253000_p3_learning_customer_scope_guard');
    expect(verifier).toContain('20260813250000_p3_learning_community_core');
    expect(verifier).toContain('20260813251000_p3_learning_community_scope_guard');
    expect(verifier).toContain('20260813252000_p3_learning_community_public_access');
    expect(verifier).toContain('20260813253000_p3_learning_customer_scope_guard');
    expect(verifier).toContain('P3.7 learning/community tables are incomplete');
    expect(verifier).toContain('Raw public learning/community secret column must not exist');
    expect(verifier).toContain('Learning/community customer tenant guards are incomplete');
    expect(customerGuard).toContain('guard_learning_community_customer_scope');
    expect(customerGuard).toContain('JOIN public.outlets o ON o.id=c.outlet_id');
    expect(customerGuard).toContain("CONSTRAINT='learning_community_customer_tenant_scope'");
  });

  test('learning and community admin capabilities are named and explicit', () => {
    for (const capability of [
      'digital.learning.read',
      'digital.learning.manage',
      'digital.community.read',
      'digital.community.manage',
    ]) expect(capabilities).toContain(`'${capability}'`);
  });

  test('exact-head accepted learning and community applications are live on the production workspace', () => {
    expect(catalogLine('elearning')).toContain("status: 'live'");
    expect(catalogLine('elearning')).toContain("path: '/learning'");
    expect(catalogLine('forum')).toContain("status: 'live'");
    expect(catalogLine('forum')).toContain("path: '/learning'");
  });
});
