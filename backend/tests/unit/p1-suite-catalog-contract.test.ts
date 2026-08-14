import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const catalog = read('frontend/src/config/suiteCatalog.ts');
const app = read('frontend/src/App.tsx');
const moduleSelector = read('frontend/src/pages/ModuleSelectorPage.tsx');

const findCatalogLine = (appId: string) =>
  catalog.split('\n').find((candidate) => candidate.includes(`{ id: '${appId}', category:`));

describe('P1 runtime catalog acceptance contract', () => {
  test.each(['crm', 'sales', 'customer-database', 'loyalty'])(
    '%s is live on the accepted revenue runtime',
    (appId) => {
      const line = findCatalogLine(appId);
      expect(line).toBeDefined();
      expect(line).toContain("status: 'live'");
      expect(line).toContain("path: '/revenue'");
    },
  );

  test.each(['purchase', 'barcode', 'manufacturing', 'quality', 'maintenance'])(
    '%s is live on the accepted supply-chain runtime',
    (appId) => {
      const line = findCatalogLine(appId);
      expect(line).toBeDefined();
      expect(line).toContain("status: 'live'");
      expect(line).toContain("bundle: 'inventory'");
      expect(line).toContain("path: '/supply-chain'");
    },
  );

  test('aggregate routes point to the accepted owner and tenant-gated workspaces', () => {
    expect(app).toContain('path="/revenue"');
    expect(app).toContain('<RevenueWorkspacePage />');
    expect(app).toContain('path="/supply-chain"');
    expect(app).toContain('moduleKey="inventory"');
    expect(app).toContain('<SupplyChainWorkspacePage />');
  });

  test('module selector preserves canonical catalog status instead of downgrading P1', () => {
    expect(moduleSelector).not.toContain("status: 'partial' as SuiteImplementationStatus");
    expect(moduleSelector).toContain("path === '/revenue'");
    expect(moduleSelector).toContain("path === '/supply-chain'");
  });

  test('unaccepted supply-chain blueprints stay unpromoted', () => {
    for (const appId of ['plm', 'repairs']) {
      const line = findCatalogLine(appId);
      expect(line).toContain("status: 'blueprint'");
    }
  });
});
