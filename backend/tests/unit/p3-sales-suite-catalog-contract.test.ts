import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const catalog = read('frontend/src/config/suiteCatalog.ts');
const app = read('frontend/src/App.tsx');

const findCatalogLine = (appId: string) =>
  catalog.split('\n').find((candidate) => candidate.includes(`{ id: '${appId}'`));

describe('P3 sales runtime catalog acceptance contract', () => {
  test('Subscriptions is live on the accounting-gated runtime', () => {
    const line = findCatalogLine('subscriptions');
    expect(line).toBeDefined();
    expect(line).toContain("bundle: 'accounting'");
    expect(line).toContain("status: 'live'");
    expect(line).toContain("path: '/subscriptions'");

    expect(app).toContain('path="/subscriptions"');
    expect(app).toContain('moduleKey="accounting"');
    expect(app).toContain('<SubscriptionsWorkspacePage />');
  });

  test('Rental is live on the POS-gated runtime', () => {
    const line = findCatalogLine('rental');
    expect(line).toBeDefined();
    expect(line).toContain("bundle: 'pos'");
    expect(line).toContain("status: 'live'");
    expect(line).toContain("path: '/rental'");

    expect(app).toContain('path="/rental"');
    expect(app).toContain('moduleKey="pos"');
    expect(app).toContain('<RentalWorkspacePage />');
  });

  test('P1 loyalty remains independently accepted on its revenue runtime', () => {
    const line = findCatalogLine('loyalty');
    expect(line).toContain("status: 'live'");
    expect(line).toContain("path: '/revenue'");
  });

  test('accepted P3.5 marketing apps remain live independently of sales promotion', () => {
    for (const appId of ['events', 'surveys']) {
      const line = findCatalogLine(appId);
      expect(line).toContain("status: 'live'");
      expect(line).toContain("path: '/medsos/automations?view=engagement'");
    }
  });
});
