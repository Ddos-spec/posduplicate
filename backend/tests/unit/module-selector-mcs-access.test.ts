import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const source = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/ModuleSelectorPage.tsx'), 'utf8');

describe('ModuleSelector MCS member access contract', () => {
  test('tenant entitlement remains mandatory before per-user MCS permissions', () => {
    expect(source).toContain("if (!enabledModules[app.bundle]) return false;");
    expect(source).toContain("if (!isSuperAdmin && !enabledModules[app.bundle]) return;");
  });

  test('marketplace, inbox, content, analytics, ads and settings are permission mapped', () => {
    expect(source).toContain("permissions.marketplace === true");
    expect(source).toContain("permissions.inbox === true");
    expect(source).toContain("permissions.content === true");
    expect(source).toContain("permissions.analytics === true");
    expect(source).toContain("permissions.ads === true");
    expect(source).toContain("permissions.settings === true");
  });

  test('missing MCS permission data fails closed and unrelated roles retain tenant behavior', () => {
    expect(source).toContain("if (!path || !permissions) return false;");
    expect(source).toContain("if (!isMcsMember || app.bundle !== 'commerSocial' || !app.path || app.status === 'blueprint') return true;");
  });

  test('stale cards cannot bypass the same MCS predicate during navigation', () => {
    expect(source).toContain("app.bundle === 'commerSocial' && !canMcsMemberAccessPath(app.path, mcsPermissions)");
    expect(source).toContain('navigate(app.path);');
  });

  test('team, connections, dashboard and unknown MCS routes are not implicitly granted', () => {
    expect(source).not.toContain("path === '/medsos/team' || permissions");
    expect(source).not.toContain("path === '/medsos/connections' || permissions");
    expect(source).not.toContain("path === '/medsos/dashboard' || permissions");
    expect(source).toContain('return false;\n};');
  });
});
