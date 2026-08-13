import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const catalog = read('frontend/src/config/suiteCatalog.ts');
const app = read('frontend/src/App.tsx');
const workspace = read('frontend/src/pages/WorkforceWorkspacePage.tsx');

const acceptedP2Apps = [
  'recruitment',
  'time-off',
  'appraisals',
  'payroll',
  'project',
  'timesheets',
  'planning',
  'field-service',
  'helpdesk',
  'appointments',
];

describe('P2 runtime catalog acceptance contract', () => {
  test.each(acceptedP2Apps)('%s is live on the accepted workforce/services runtime', (appId) => {
    const line = catalog.split('\n').find((candidate) => candidate.includes(`{ id: '${appId}'`));
    expect(line).toBeDefined();
    expect(line).toContain("status: 'live'");
    expect(line).toContain("bundle: 'accounting'");
    expect(line).toContain("path: '/workforce'");
  });

  test('the runtime route is tenant-gated and points at the accepted workspace', () => {
    expect(app).toContain('path="/workforce"');
    expect(app).toContain('moduleKey="accounting"');
    expect(app).toContain('<WorkforceWorkspacePage />');
  });

  test('workforce runtime exposes all accepted P2 frontend surfaces', () => {
    expect(workspace).toContain("import TimeOffPanel from './workforce/TimeOffPanel'");
    expect(workspace).toContain("import RecruitmentPanel from './workforce/RecruitmentPanel'");
    expect(workspace).toContain("import AppraisalsPanel from './workforce/AppraisalsPanel'");
    expect(workspace).toContain("import ServicesProjectPanel from './workforce/ServicesProjectPanel'");
    expect(workspace).toContain("import PayrollCurrentPanel from './workforce/PayrollCurrentPanel'");
    expect(workspace).toContain("setTab('services')");
    expect(workspace).toContain("setTab('payroll')");
  });

  test('catalog does not promote unrelated future apps as a side effect', () => {
    for (const appId of ['referrals', 'fleet', 'frontdesk', 'lunch', 'plm', 'repairs']) {
      const line = catalog.split('\n').find((candidate) => candidate.includes(`{ id: '${appId}'`));
      expect(line).toContain("status: 'blueprint'");
    }
  });
});
