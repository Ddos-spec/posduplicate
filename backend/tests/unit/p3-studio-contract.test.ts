import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('P3.8 Studio acceptance contract', () => {
  test('migration provides tenant-scoped values and immutable execution evidence', () => {
    const migration = read('backend/prisma/migrations/20260814123000_p3_studio_config/migration.sql');
    for (const table of ['studio_fields','studio_record_values','studio_workflow_rules','studio_rule_executions','studio_events']) {
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).toContain('fk_studio_record_value_field_scope');
    expect(migration).toContain('fk_studio_execution_rule_scope');
    expect(migration).toContain('trg_studio_rule_executions_immutable');
    expect(migration).toContain('trg_studio_events_immutable');
  });

  test('routes are tenant and capability gated without role middleware', () => {
    const routes = read('backend/src/modules/fnb/routes/studio.p3.routes.ts');
    expect(routes).toMatch(/router\.use\(authMiddleware, tenantMiddleware\)/);
    expect(routes).toContain("requireCapability('platform.studio.read')");
    expect(routes).toContain("requireCapability('platform.studio.manage')");
    expect(routes).not.toMatch(/roleMiddleware|requireRole|requireOwner|requireManager/);
  });

  test('Studio uses a whitelisted data DSL and never evaluates executable code', () => {
    const engine = read('backend/src/modules/fnb/services/studioRuleEngine.p3.ts');
    const controller = read('backend/src/modules/fnb/controllers/studio.p3.controller.ts');
    expect(engine).toContain("['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists']");
    expect(engine).toContain("['set_field', 'flag', 'require_approval']");
    expect(`${engine}\n${controller}`).not.toMatch(/\beval\s*\(|new Function|child_process|execSync/);
    expect(controller).not.toContain('$queryRawUnsafe');
    expect(controller).not.toContain('$executeRawUnsafe');
  });

  test('execution receipts coerce BIGSERIAL identifiers before JSON persistence', () => {
    const controller = read('backend/src/modules/fnb/controllers/studio.p3.controller.ts');
    expect(controller).toContain('fieldId: String(field.id)');
    expect(controller).not.toContain('fieldId: field.id, fieldKey');
  });

  test('catalog and accounting-gated route expose the accepted Studio workspace', () => {
    const catalog = read('frontend/src/config/suiteCatalog.ts');
    const app = read('frontend/src/App.tsx');
    const line = catalog.split('\n').find((candidate) => candidate.includes("{ id: 'studio', category:"));
    expect(line).toContain("status: 'live'");
    expect(line).toContain("path: '/studio'");
    expect(app).toContain('path="/studio"');
    expect(app).toContain('moduleKey="accounting"');
    expect(app).toContain('<StudioWorkspacePage />');
  });
});
