type JsonRecord = Record<string, any>;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
  data?: T;
};

type CheckLevel = 'PASS' | 'WARN' | 'FAIL';

type CheckResult = {
  level: CheckLevel;
  name: string;
  detail: string;
};

type SocialHubStatus = {
  configured: boolean;
  active: boolean;
  hasApiKey: boolean;
  hasWorkspaceUrl: boolean;
  reachable: boolean;
  statsAvailable: boolean;
  status: string;
  message: string;
};

type SettingsEnvelope = {
  myCommerSocialSettings?: unknown;
  myCommerSocialSettingsSavedAt?: string;
};

function readBool(name: string, fallback = false): boolean {
  const value = String(process.env[name] || '').trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value);
}

function formatLevel(level: CheckLevel): string {
  switch (level) {
    case 'PASS':
      return 'PASS';
    case 'WARN':
      return 'WARN';
    default:
      return 'FAIL';
  }
}

async function requestJson<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const raw = await response.text();
  const parsed = raw ? (JSON.parse(raw) as ApiEnvelope<T>) : {};

  if (!response.ok) {
    const message = parsed?.error?.message || parsed?.message || `HTTP ${response.status}`;
    throw new Error(`${path} -> ${message}`);
  }

  return parsed;
}

async function main() {
  const baseUrl = String(process.env.SMOKE_BASE_URL || process.env.PUBLIC_URL || 'http://localhost:3500').replace(/\/$/, '');
  const email = String(process.env.SMOKE_EMAIL || '').trim();
  const password = String(process.env.SMOKE_PASSWORD || '');
  const requireWa = readBool('SMOKE_REQUIRE_WA', false);
  const requireZernio = readBool('SMOKE_REQUIRE_ZERNIO', false);
  const expectSocialAccount = readBool('SMOKE_EXPECT_SOCIAL_ACCOUNT', false);
  const expectAdsAccount = readBool('SMOKE_EXPECT_ADS_ACCOUNT', false);
  const checks: CheckResult[] = [];

  if (!email || !password) {
    console.error('SMOKE_EMAIL and SMOKE_PASSWORD are required.');
    process.exit(1);
  }

  const login = await requestJson<{ token: string }>(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const token = login.data?.token;
  if (!token) {
    throw new Error('Login succeeded but token is missing.');
  }
  checks.push({ level: 'PASS', name: 'Auth login', detail: 'Bearer token didapat.' });

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const me = await requestJson<JsonRecord>(baseUrl, '/api/auth/me', { headers: authHeaders });
  checks.push({
    level: 'PASS',
    name: 'Auth me',
    detail: `Login sebagai ${String(me.data?.email || email)}`,
  });

  const tenant = await requestJson<JsonRecord>(baseUrl, '/api/tenants/me', { headers: authHeaders });
  checks.push({
    level: 'PASS',
    name: 'Tenant context',
    detail: `Tenant ${String(tenant.data?.business_name || tenant.data?.company_name || tenant.data?.id || 'aktif')}`,
  });

  const settings = await requestJson<SettingsEnvelope & JsonRecord>(baseUrl, '/api/settings', { headers: authHeaders });
  checks.push({
    level: 'PASS',
    name: 'Workspace settings',
    detail: settings.data?.myCommerSocialSettings
      ? 'Settings workspace MyCommerSocial sudah tersedia di tenant settings.'
      : 'Endpoint settings hidup; workspace settings belum pernah disimpan dari halaman Settings.',
  });

  const hub = await requestJson<{ connectors?: JsonRecord[] }>(baseUrl, '/api/medsos/integrations/hub', { headers: authHeaders });
  const connectors = Array.isArray(hub.data?.connectors) ? hub.data?.connectors || [] : [];
  const socialHub = connectors.find((item) => item.slug === 'social-hub');
  const marketplaceHub = connectors.find((item) => item.slug === 'marketplace-hub');
  const adsHub = connectors.find((item) => item.slug === 'meta-ads-hub');

  checks.push({
    level: socialHub && marketplaceHub && adsHub ? 'PASS' : 'FAIL',
    name: 'Managed connectors',
    detail: `social-hub=${Boolean(socialHub)}, marketplace-hub=${Boolean(marketplaceHub)}, meta-ads-hub=${Boolean(adsHub)}`,
  });

  const waStatusResponse = await requestJson<SocialHubStatus>(baseUrl, '/api/medsos/integrations/proxy/social-hub/status', { headers: authHeaders });
  const waStatus = waStatusResponse.data!;

  if (!waStatus.configured) {
    checks.push({
      level: requireWa ? 'FAIL' : 'WARN',
      name: 'WA Inbox status',
      detail: waStatus.message,
    });
  } else if (!waStatus.reachable) {
    checks.push({
      level: requireWa ? 'FAIL' : 'WARN',
      name: 'WA Inbox reachability',
      detail: waStatus.message,
    });
  } else {
    checks.push({
      level: 'PASS',
      name: 'WA Inbox reachability',
      detail: waStatus.message,
    });
  }

  const zernio = await requestJson<{ accounts?: JsonRecord[] }>(baseUrl, '/api/medsos/zernio/accounts', { headers: authHeaders });
  const accounts = Array.isArray(zernio.data?.accounts) ? zernio.data?.accounts || [] : [];
  const socialAccounts = accounts.filter((item) => !String(item.platform || '').toLowerCase().includes('ads'));
  const adsAccounts = accounts.filter((item) => String(item.platform || '').toLowerCase().includes('ads'));

  checks.push({
    level: accounts.length > 0 ? 'PASS' : (requireZernio ? 'FAIL' : 'WARN'),
    name: 'Zernio accounts',
    detail: `total=${accounts.length}, social=${socialAccounts.length}, ads=${adsAccounts.length}`,
  });

  if (expectSocialAccount) {
    checks.push({
      level: socialAccounts.length > 0 ? 'PASS' : 'FAIL',
      name: 'Expected social account',
      detail: socialAccounts.length > 0 ? `${socialAccounts.length} akun social terhubung.` : 'Belum ada akun social terhubung di Zernio.',
    });
  }

  if (expectAdsAccount) {
    checks.push({
      level: adsAccounts.length > 0 ? 'PASS' : 'FAIL',
      name: 'Expected ads account',
      detail: adsAccounts.length > 0 ? `${adsAccounts.length} akun ads terhubung.` : 'Belum ada akun ads terhubung di Zernio.',
    });
  }

  const adsSummary = await requestJson<JsonRecord | null>(baseUrl, '/api/medsos/zernio/ads/summary', { headers: authHeaders });
  checks.push({
    level: adsSummary.data ? 'PASS' : (expectAdsAccount ? 'FAIL' : 'WARN'),
    name: 'Ads summary route',
    detail: adsSummary.data
      ? `Ads summary tersedia${adsSummary.data?.campaigns ? ` (${(adsSummary.data.campaigns as unknown[]).length} campaign)` : ''}.`
      : 'Belum ada data ads summary yang bisa ditampilkan.',
  });

  const posts = await requestJson<JsonRecord[] | null>(baseUrl, '/api/medsos/posts', { headers: authHeaders });
  const postsCount = Array.isArray(posts.data) ? posts.data.length : 0;
  checks.push({
    level: 'PASS',
    name: 'Posts route',
    detail: `${postsCount} post terbaca dari modul medsos.`,
  });

  console.log('\nMyCommerSocial smoke check');
  console.log(`Base URL : ${baseUrl}`);
  console.log(`Account  : ${email}`);
  console.log('----------------------------------------');
  for (const check of checks) {
    console.log(`[${formatLevel(check.level)}] ${check.name} - ${check.detail}`);
  }

  const failed = checks.filter((item) => item.level === 'FAIL');
  const warned = checks.filter((item) => item.level === 'WARN');
  console.log('----------------------------------------');
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed, ${warned.length} warning, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('MyCommerSocial smoke check failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
