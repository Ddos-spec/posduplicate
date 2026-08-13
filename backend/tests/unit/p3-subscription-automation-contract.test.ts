import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('backend/prisma/migrations/20260813213000_p3_subscription_automation/migration.sql');
const settings = read('backend/src/modules/fnb/services/subscription-automation-settings.p3.service.ts');
const runner = read('backend/src/modules/fnb/services/subscription-automation-runner.p3.service.ts');
const scheduler = read('backend/src/services/subscriptionAutomationScheduler.service.ts');
const routes = read('backend/src/modules/fnb/routes/subscription.p3.routes.ts');
const controller = read('backend/src/modules/fnb/controllers/subscription.p3.controller.ts');
const frontend = read('frontend/src/pages/subscriptions/SubscriptionAutomationPanel.tsx');

describe('P3.3 controlled subscription automation', () => {
  test('automation is disabled by default and enabling requires an explicit actor', () => {
    expect(migration).toContain('enabled BOOLEAN NOT NULL DEFAULT FALSE');
    expect(migration).toContain('subscription_automation_actor_required');
    expect(settings).toContain('SUBSCRIPTION_AUTOMATION_ACTOR_REQUIRED');
  });

  test('automation actor must be active, same tenant, and management-authorized', () => {
    expect(settings).toContain('Number(actor.tenant_id) !== tenantId');
    expect(settings).toContain('actor.is_active === false');
    expect(settings).toContain('MANAGE_ROLES');
    expect(settings).toContain('SUBSCRIPTION_AUTOMATION_ACTOR_FORBIDDEN');
  });

  test('runner processes only due active subscriptions through the idempotent renewal service', () => {
    expect(runner).toContain("status='active' AND next_renewal_at <= CURRENT_DATE");
    expect(runner).toContain('materializeSubscriptionRenewal(tenantId, actor.id, Number(row.id), expectedRenewalAt)');
    expect(runner).toContain('max_renewals_per_run');
  });

  test('scheduler is hourly and skips overlapping in-process runs', () => {
    expect(scheduler).toContain("cron.schedule('15 * * * *'");
    expect(scheduler).toContain('if (running) return');
    expect(scheduler).toContain('runDueSubscriptionAutomation');
  });

  test('settings and manual automation run require subscription capabilities', () => {
    expect(routes).toContain("router.get('/automation', requireCapability('revenue.subscription.read')");
    expect(routes).toContain("router.put('/automation', requireCapability('revenue.subscription.manage')");
    expect(routes).toContain("router.post('/automation/run', requireCapability('revenue.subscription.manage')");
    expect(controller).toContain('updateSubscriptionAutomationSettings');
    expect(controller).toContain('runTenantSubscriptionAutomation');
  });

  test('frontend exposes explicit actor and disabled-default controls', () => {
    expect(frontend).toContain('Automation actor');
    expect(frontend).toContain('Disabled');
    expect(frontend).toContain('Run now');
    expect(frontend).toContain('max_renewals_per_run');
  });
});
