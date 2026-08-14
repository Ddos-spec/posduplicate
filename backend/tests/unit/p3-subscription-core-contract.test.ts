import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('backend/prisma/migrations/20260813210000_p3_subscription_core/migration.sql');
const service = read('backend/src/modules/fnb/services/subscription.p3.service.ts');
const routes = read('backend/src/modules/fnb/routes/subscription.p3.routes.ts');
const capabilities = read('backend/src/middlewares/capability.middleware.ts');
const runner = read('backend/src/scripts/apply-p3-migrations.ts');
const verifier = read('backend/src/scripts/verify-p3-database.ts');
const catalog = read('frontend/src/config/suiteCatalog.ts');

describe('P3.3 subscription core', () => {
  test('reuses existing business sources and downstream ledgers', () => {
    for (const target of ['public.customers(id)', 'public.items(id)', 'public.sales_orders(id)', 'accounting.accounts_receivable(id)']) expect(migration).toContain(`REFERENCES ${target}`);
    expect(service).toContain('INSERT INTO public.sales_orders');
    expect(service).toContain('INSERT INTO accounting.accounts_receivable');
  });

  test('renewals are row locked, period unique, and retry safe', () => {
    expect(service).toContain('FOR UPDATE OF s');
    expect(service).toContain("existing[0]?.status === 'materialized'");
    expect(migration).toContain('ux_subscription_renewal_period');
    expect(migration).toContain('ux_subscription_renewal_key');
  });

  test('lifecycle is capability gated and audited', () => {
    expect(capabilities).toContain("'revenue.subscription.read'");
    expect(capabilities).toContain("'revenue.subscription.manage'");
    expect(routes).toContain("requireCapability('revenue.subscription.manage')");
    expect(migration).toContain('trg_subscription_events_immutable');
  });

  test('migration runner and DB verifier cover P3.3', () => {
    expect(runner).toContain('20260813210000_p3_subscription_core');
    expect(verifier).toContain('P3.3 subscription tables are incomplete');
    expect(verifier).toContain('subscription_renewals:accounting.accounts_receivable');
  });

  test('catalog remains live after full frontend and exact-head acceptance', () => {
    const app = catalog.split('\n').find((line) => line.includes("{ id: 'subscriptions'"));
    expect(app).toContain("bundle: 'accounting'");
    expect(app).toContain("status: 'live'");
    expect(app).toContain("path: '/subscriptions'");
  });
});
