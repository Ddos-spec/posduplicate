import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('P4 intelligence and controlled-action acceptance contract', () => {
  test('migration locks evidence, idempotency, audit, and action transitions', () => {
    const migration = read('backend/prisma/migrations/20260814130000_p4_intelligence_actions/migration.sql');
    for (const table of ['intelligence_runs','intelligence_findings','agent_action_requests','agent_action_events']) {
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).toContain('ux_agent_action_idempotency');
    expect(migration).toContain('trg_agent_action_transition');
    expect(migration).toContain('trg_agent_action_requests_no_delete');
    expect(migration).toContain("OLD.status = 'pending_approval' AND NEW.status IN ('approved','rejected','cancelled')");
  });

  test('routes separate read, run, request, approve, and execute capabilities', () => {
    const routes = read('backend/src/modules/fnb/routes/intelligence.p4.routes.ts');
    for (const capability of [
      'intelligence.read','intelligence.run','intelligence.actions.request',
      'intelligence.actions.approve','intelligence.actions.execute',
    ]) expect(routes).toContain(`requireCapability('${capability}')`);
    expect(routes).toMatch(/router\.use\(authMiddleware, tenantMiddleware\)/);
    expect(routes).not.toMatch(/roleMiddleware|requireRole|requireOwner|requireManager/);
  });

  test('the only operational action is an approved, locked, idempotent RFQ', () => {
    const controller = read('backend/src/modules/fnb/controllers/intelligence.p4.controller.ts');
    const server = read('backend/src/server.ts');
    expect(controller).toContain("action.status !== 'approved'");
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('ACTION_STALE_REAPPROVAL_REQUIRED');
    expect(controller).toContain('purchase_rfq_number_seq');
    expect(controller).toContain('rfq_created_by_approved_action');
    expect(server).toContain("'Idempotency-Key'");
    expect(controller).not.toContain('$queryRawUnsafe');
    expect(controller).not.toContain('$executeRawUnsafe');
  });

  test('copilot is explicitly deterministic and reports unavailable context', () => {
    const engine = read('backend/src/modules/fnb/services/intelligenceEngine.p4.ts');
    const controller = read('backend/src/modules/fnb/controllers/intelligence.p4.controller.ts');
    expect(controller).toContain("mode: 'deterministic_evidence'");
    expect(engine).toContain("unavailable: ['bank balance'");
    expect(engine).toContain("observed: ['transactions'");
  });

  test('catalog and accounting-gated route expose accepted intelligence surfaces', () => {
    const catalog = read('frontend/src/config/suiteCatalog.ts');
    const app = read('frontend/src/App.tsx');
    for (const appId of ['anomaly-monitor', 'ai-copilot']) {
      const line = catalog.split('\n').find((candidate) => candidate.includes(`{ id: '${appId}', category:`));
      expect(line).toContain("status: 'live'");
      expect(line).toContain("path: '/intelligence'");
    }
    expect(app).toContain('path="/intelligence"');
    expect(app).toContain('<IntelligenceWorkspacePage />');
  });
});
