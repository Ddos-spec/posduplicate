import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Save } from 'lucide-react';
import {
  getSubscriptionAutomationSettings,
  runSubscriptionAutomation,
  updateSubscriptionAutomationSettings,
  type SubscriptionAutomationSettings,
} from '../../services/subscriptionService';
import { userService, type User } from '../../services/userService';

const manageRoles = new Set(['owner', 'manager', 'admin', 'super admin', 'super_admin']);

export default function SubscriptionAutomationPanel() {
  const [settings, setSettings] = useState<SubscriptionAutomationSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const load = async () => {
    setError('');
    try {
      const [settingsRow, usersResponse] = await Promise.all([
        getSubscriptionAutomationSettings(),
        userService.getAll(),
      ]);
      setSettings(settingsRow);
      setUsers(usersResponse.data || []);
    } catch {
      setError('Automation settings belum dapat dimuat.');
    }
  };

  useEffect(() => { void load(); }, []);

  const actors = useMemo(() => users.filter((user) => user.isActive && manageRoles.has(String(user.roles?.name || '').trim().toLowerCase())), [users]);

  const save = async () => {
    if (!settings) return;
    setSaving(true); setError(''); setResult('');
    try {
      const updated = await updateSubscriptionAutomationSettings({
        enabled: settings.enabled,
        automationUserId: settings.automation_user_id || null,
        maxRenewalsPerRun: settings.max_renewals_per_run,
      });
      setSettings(updated);
      setResult('Automation settings saved.');
    } catch {
      setError('Settings ditolak. Actor harus user aktif tenant ini dengan authority manage.');
    } finally { setSaving(false); }
  };

  const runNow = async () => {
    setRunning(true); setError(''); setResult('');
    try {
      const row = await runSubscriptionAutomation();
      setResult(row.skipped ? `Skipped: ${row.reason || 'disabled'}` : `Attempted ${row.attempted}; success ${row.succeeded}; reused ${row.reused}; failed ${row.failed}.`);
      await load();
    } catch {
      setError('Auto-renew run gagal. Tidak ada renewal yang dianggap sukses tanpa response server.');
    } finally { setRunning(false); }
  };

  if (!settings) return <section className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> Loading automation settings…</div>{error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}</section>;

  return <section className="rounded-2xl border bg-white p-4">
    <div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Controlled automation</p><h2 className="mt-1 text-lg font-black">Auto-renew</h2><p className="mt-1 text-sm text-slate-500">Disabled by default. Each run uses an explicit active tenant manager/owner actor and the same idempotent renewal service as manual billing.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="rounded-xl border p-3 text-sm"><span className="font-bold">Enabled</span><select value={settings.enabled ? 'yes' : 'no'} onChange={(e) => setSettings({ ...settings, enabled: e.target.value === 'yes' })} className="mt-2 w-full rounded-lg border px-2 py-2"><option value="no">Disabled</option><option value="yes">Enabled</option></select></label>
      <label className="rounded-xl border p-3 text-sm"><span className="font-bold">Automation actor</span><select value={settings.automation_user_id || 0} onChange={(e) => setSettings({ ...settings, automation_user_id: Number(e.target.value) || null })} className="mt-2 w-full rounded-lg border px-2 py-2"><option value={0}>Select manager / owner</option>{actors.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.roles?.name}</option>)}</select></label>
      <label className="rounded-xl border p-3 text-sm"><span className="font-bold">Max renewals/run</span><input type="number" min={1} max={500} value={settings.max_renewals_per_run} onChange={(e) => setSettings({ ...settings, max_renewals_per_run: Number(e.target.value) })} className="mt-2 w-full rounded-lg border px-2 py-2" /></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2"><button disabled={saving || (settings.enabled && !settings.automation_user_id)} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button><button disabled={running || !settings.enabled || !settings.automation_user_id} onClick={() => void runNow()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-black disabled:opacity-50">{running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Run now</button></div>
    <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><p>Last run: <b>{settings.last_run_at ? new Date(settings.last_run_at).toLocaleString() : 'never'}</b></p><p>Last success: <b>{settings.last_success_at ? new Date(settings.last_success_at).toLocaleString() : 'never'}</b></p><p>Actor: <b>{settings.automation_user_name || settings.automation_user_email || 'not set'}</b></p></div>
    {settings.last_error && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">Last error: {settings.last_error}</p>}
    {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700">{error}</p>}
    {result && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-800">{result}</p>}
  </section>;
}
