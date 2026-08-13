import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Calculator, CheckCircle2, FileCheck2, Landmark, LockKeyhole, RefreshCw, Settings2, ShieldAlert, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  activatePayrollProfile,
  createPayrollPeriod,
  finalizePayrollOfficial,
  getPayrollAccountingSettings,
  getPayrollActivationEvents,
  getPayrollCurrentContext,
  getPayrollDetails,
  getPayrollMaterializations,
  getPayrollPeriods,
  getPayrollPostings,
  getPayrollProfiles,
  getPayrollRuns,
  getPayrollStatutorySettings,
  materializePayroll,
  payrollErrorMessage,
  runPayrollFinalVerification,
  runPayrollVerification,
  upsertPayrollAccountingSettings,
  upsertPayrollStatutorySetting,
  type PayrollAccountingSettings,
  type PayrollActivationEvent,
  type PayrollCurrentContext,
  type PayrollDetail,
  type PayrollMaterialization,
  type PayrollPeriod,
  type PayrollPosting,
  type PayrollProfile,
  type PayrollRun,
  type PayrollStatutorySetting,
} from '../../services/payrollCurrentService';

type Section = 'readiness' | 'verification' | 'official';
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-emerald-500';
const money = (value?: number | string | null) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateOnly = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '—';
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const periodYear = (period: PayrollPeriod) => new Date(period.period_end).getUTCFullYear();
const periodMonth = (period: PayrollPeriod) => new Date(period.period_end).getUTCMonth() + 1;
const runEnd = (run: PayrollRun) => typeof run.input_snapshot?.period?.end === 'string' ? run.input_snapshot.period.end : undefined;

export default function PayrollCurrentPanel() {
  const [section, setSection] = useState<Section>('readiness');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [context, setContext] = useState<PayrollCurrentContext>({ employees: [], accounts: [] });
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
  const [settings, setSettings] = useState<PayrollStatutorySetting[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [accounting, setAccounting] = useState<PayrollAccountingSettings | null>(null);
  const [materializations, setMaterializations] = useState<PayrollMaterialization[]>([]);
  const [postings, setPostings] = useState<PayrollPosting[]>([]);
  const [activations, setActivations] = useState<PayrollActivationEvent[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [details, setDetails] = useState<PayrollDetail[]>([]);
  const [detailTotals, setDetailTotals] = useState<{ totalGross: number; totalDeductions: number; totalNet: number; totalEmployerCost: number } | null>(null);
  const [periodForm, setPeriodForm] = useState({ periodStart: '', periodEnd: '', payDate: '', description: '' });
  const [statForm, setStatForm] = useState({ fixedAllowanceMonthly: '0', applicableHealthMinimumWage: '', bpjsEmploymentEnabled: true, bpjsHealthEnabled: true, jkkRiskLevel: '1', ptkpStatusYearStart: 'TK/0', taxSubjectiveCase: 'full_year_same_employer' as 'unverified' | 'full_year_same_employer', zakatViaEmployerMonthly: '0' });
  const [activationForm, setActivationForm] = useState({ runId: '', effectiveFrom: '' });
  const [accountForm, setAccountForm] = useState({ salaryExpense: '', employerStatutoryExpense: '', salaryPayable: '', pph21Payable: '', bpjsPayable: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getPayrollCurrentContext(), getPayrollPeriods(), getPayrollProfiles(), getPayrollStatutorySettings(), getPayrollRuns(),
      getPayrollAccountingSettings(), getPayrollMaterializations(), getPayrollPostings(), getPayrollActivationEvents(),
    ]);
    const required = results.slice(0, 5);
    setAuthorized(required.some((row) => row.status === 'fulfilled'));
    if (results[0].status === 'fulfilled') setContext(results[0].value);
    if (results[1].status === 'fulfilled') setPeriods(results[1].value);
    if (results[2].status === 'fulfilled') setProfiles(results[2].value);
    if (results[3].status === 'fulfilled') setSettings(results[3].value);
    if (results[4].status === 'fulfilled') setRuns(results[4].value);
    if (results[5].status === 'fulfilled') setAccounting(results[5].value);
    if (results[6].status === 'fulfilled') setMaterializations(results[6].value);
    if (results[7].status === 'fulfilled') setPostings(results[7].value);
    if (results[8].status === 'fulfilled') setActivations(results[8].value);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const selected = periods.find((row) => row.id === Number(selectedPeriodId));
    if (!selected && periods[0]) setSelectedPeriodId(String(periods[0].id));
    const verified = profiles.find((row) => row.profile_code === 'ID-PAYROLL-2026' && row.version === 2 && ['draft', 'active'].includes(row.status));
    if (verified && !profiles.some((row) => row.id === Number(selectedProfileId))) setSelectedProfileId(String(verified.id));
    if (context.employees[0] && !context.employees.some((row) => row.id === Number(selectedEmployeeId))) setSelectedEmployeeId(String(context.employees[0].id));
  }, [context.employees, periods, profiles, selectedEmployeeId, selectedPeriodId, selectedProfileId]);

  const selectedPeriod = useMemo(() => periods.find((row) => row.id === Number(selectedPeriodId)) || null, [periods, selectedPeriodId]);
  const selectedEmployee = useMemo(() => context.employees.find((row) => row.id === Number(selectedEmployeeId)) || null, [context.employees, selectedEmployeeId]);
  const selectedSetting = useMemo(() => settings.find((row) => row.employee_id === Number(selectedEmployeeId)) || null, [selectedEmployeeId, settings]);
  const activeTenantProfile = useMemo(() => profiles.find((row) => row.tenant_id != null && row.profile_code === 'ID-PAYROLL-2026' && row.version === 2 && row.status === 'active') || null, [profiles]);
  const finalRuns = useMemo(() => runs.filter((row) => row.tax_period_kind === 'final'), [runs]);
  const selectedPeriodRuns = useMemo(() => runs.filter((row) => row.period_id === Number(selectedPeriodId)), [runs, selectedPeriodId]);
  const latestSelectedRun = selectedPeriodRuns[0] || null;
  const selectedMaterialization = useMemo(() => materializations.find((row) => row.period_id === Number(selectedPeriodId)) || null, [materializations, selectedPeriodId]);
  const selectedPosting = useMemo(() => postings.find((row) => row.period_id === Number(selectedPeriodId)) || null, [postings, selectedPeriodId]);
  const expenseAccounts = useMemo(() => context.accounts.filter((row) => row.normal_balance === 'DEBIT'), [context.accounts]);
  const payableAccounts = useMemo(() => context.accounts.filter((row) => row.normal_balance === 'CREDIT'), [context.accounts]);
  const settingsMap = useMemo(() => new Map(settings.map((row) => [row.employee_id, row])), [settings]);
  const readiness = useMemo(() => context.employees.map((employee) => ({ employee, setting: settingsMap.get(employee.id), ready: Boolean(employee.nik && employee.basic_salary != null && settingsMap.get(employee.id)?.setting_id) })), [context.employees, settingsMap]);

  useEffect(() => {
    const row = selectedSetting;
    if (!row) {
      setStatForm({ fixedAllowanceMonthly: '0', applicableHealthMinimumWage: '', bpjsEmploymentEnabled: true, bpjsHealthEnabled: true, jkkRiskLevel: String(selectedEmployee?.jkk_risk_level || 1), ptkpStatusYearStart: selectedEmployee?.ptkp_status || 'TK/0', taxSubjectiveCase: 'full_year_same_employer', zakatViaEmployerMonthly: '0' });
      return;
    }
    setStatForm({ fixedAllowanceMonthly: String(row.fixed_allowance_monthly || 0), applicableHealthMinimumWage: row.applicable_health_minimum_wage == null ? '' : String(row.applicable_health_minimum_wage), bpjsEmploymentEnabled: Boolean(row.bpjs_employment_enabled), bpjsHealthEnabled: Boolean(row.bpjs_health_enabled), jkkRiskLevel: String(row.jkk_risk_level || 1), ptkpStatusYearStart: row.ptkp_status_year_start || selectedEmployee?.ptkp_status || 'TK/0', taxSubjectiveCase: row.tax_subjective_case || 'unverified', zakatViaEmployerMonthly: String(row.zakat_via_employer_monthly || 0) });
  }, [selectedEmployee, selectedSetting]);

  useEffect(() => {
    if (!accounting) return;
    setAccountForm({ salaryExpense: String(accounting.salary_expense_account_id || ''), employerStatutoryExpense: String(accounting.employer_statutory_expense_account_id || ''), salaryPayable: String(accounting.salary_payable_account_id || ''), pph21Payable: String(accounting.pph21_payable_account_id || ''), bpjsPayable: String(accounting.bpjs_payable_account_id || '') });
  }, [accounting]);

  useEffect(() => {
    if (finalRuns[0] && !activationForm.runId) {
      const end = runEnd(finalRuns[0]);
      setActivationForm({ runId: String(finalRuns[0].id), effectiveFrom: end ? `${end.slice(0, 4)}-01-01` : '' });
    }
  }, [activationForm.runId, finalRuns]);

  const execute = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(payrollErrorMessage(error, 'Aksi payroll gagal')); }
    finally { setWorking(null); }
  };

  const submitPeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!periodForm.periodStart || !periodForm.periodEnd) return toast.error('Tanggal awal dan akhir wajib diisi');
    setWorking('period');
    try {
      const created = await createPayrollPeriod({ periodStart: periodForm.periodStart, periodEnd: periodForm.periodEnd, payDate: periodForm.payDate || undefined, description: periodForm.description || undefined });
      setSelectedPeriodId(String(created.id));
      setPeriodForm({ periodStart: '', periodEnd: '', payDate: '', description: '' });
      toast.success('Periode payroll dibuat');
      await load();
    } catch (error) { toast.error(payrollErrorMessage(error, 'Periode gagal dibuat')); }
    finally { setWorking(null); }
  };

  const submitStatutory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId) return;
    await execute('statutory', () => upsertPayrollStatutorySetting(Number(selectedEmployeeId), { fixedAllowanceMonthly: Number(statForm.fixedAllowanceMonthly), applicableHealthMinimumWage: statForm.applicableHealthMinimumWage ? Number(statForm.applicableHealthMinimumWage) : null, bpjsEmploymentEnabled: statForm.bpjsEmploymentEnabled, bpjsHealthEnabled: statForm.bpjsHealthEnabled, jkkRiskLevel: Number(statForm.jkkRiskLevel), ptkpStatusYearStart: statForm.ptkpStatusYearStart || null, taxSubjectiveCase: statForm.taxSubjectiveCase, zakatViaEmployerMonthly: Number(statForm.zakatViaEmployerMonthly) }), 'Statutory settings disimpan');
  };

  const priorRunIdsForSelectedDecember = () => {
    if (!selectedPeriod) return [];
    const year = periodYear(selectedPeriod);
    const byMonth = new Map<number, PayrollRun>();
    for (const run of runs) {
      if (run.tax_period_kind !== 'non_final') continue;
      const end = runEnd(run);
      if (!end) continue;
      const parsed = new Date(end);
      if (parsed.getUTCFullYear() !== year) continue;
      const month = parsed.getUTCMonth() + 1;
      if (month < 1 || month > 11 || byMonth.has(month)) continue;
      byMonth.set(month, run);
    }
    return Array.from({ length: 11 }, (_, index) => byMonth.get(index + 1)?.id).filter((id): id is number => Boolean(id));
  };

  const verifySelected = async () => {
    if (!selectedPeriod || !selectedProfileId) return toast.error('Pilih period dan verified profile');
    if (periodMonth(selectedPeriod) === 12) {
      const priorIds = priorRunIdsForSelectedDecember();
      if (priorIds.length !== 11) return toast.error(`Final verification butuh 11 prior run Jan–Nov; ditemukan ${priorIds.length}`);
      if (!window.confirm('Konfirmasi kasus full-year same-employer untuk final tax period Desember dan gunakan 11 prior verification run Jan–Nov?')) return;
      await execute('verify', () => runPayrollFinalVerification(selectedPeriod.id, Number(selectedProfileId), priorIds), 'Final verification run dibuat');
    } else {
      if (!window.confirm('Konfirmasi periode ini BUKAN Masa Pajak Terakhir dan buat verification preview immutable?')) return;
      await execute('verify', () => runPayrollVerification(selectedPeriod.id, Number(selectedProfileId)), 'Verification run dibuat');
    }
  };

  const submitActivation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activationForm.runId || !activationForm.effectiveFrom) return toast.error('Final verification run dan effective date wajib diisi');
    if (!window.confirm('Aktifkan tenant-specific payroll profile berdasarkan final verification evidence ini? Global reference profile tetap draft.')) return;
    await execute('activate', () => activatePayrollProfile(Number(activationForm.runId), activationForm.effectiveFrom), 'Tenant payroll profile diaktifkan');
  };

  const submitAccounting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (Object.values(accountForm).some((value) => !value)) return toast.error('Lima mapping account wajib dipilih');
    await execute('accounts', () => upsertPayrollAccountingSettings({ salaryExpenseAccountId: Number(accountForm.salaryExpense), employerStatutoryExpenseAccountId: Number(accountForm.employerStatutoryExpense), salaryPayableAccountId: Number(accountForm.salaryPayable), pph21PayableAccountId: Number(accountForm.pph21Payable), bpjsPayableAccountId: Number(accountForm.bpjsPayable) }), 'Payroll accounting mapping disimpan');
  };

  const materializeSelected = async () => {
    if (!selectedPeriod || !latestSelectedRun) return toast.error('Pilih period yang memiliki verification run');
    if (!window.confirm(`Materialize run #${latestSelectedRun.id} menjadi official payroll_details? Setelah ini detail payroll immutable dan period menjadi calculated.`)) return;
    await execute('materialize', () => materializePayroll(selectedPeriod.id, latestSelectedRun.id), 'Official payroll dimaterialize');
  };

  const loadDetails = async () => {
    if (!selectedPeriod) return;
    setWorking('details');
    try { const result = await getPayrollDetails(selectedPeriod.id); setDetails(result.details); setDetailTotals(result.totals); }
    catch (error) { toast.error(payrollErrorMessage(error, 'Payroll details gagal dimuat')); }
    finally { setWorking(null); }
  };

  const finalizeSelected = async () => {
    if (!selectedPeriod) return;
    if (!window.confirm('FINAL confirmation: post payroll journal + General Ledger dan ubah period menjadi finalized? Operasi ini tidak menggunakan legacy finalize.')) return;
    await execute('finalize', () => finalizePayrollOfficial(selectedPeriod.id), 'Official payroll finalized dan posted ke GL');
    await loadDetails();
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Payroll current-law…</div>;
  if (!authorized) return <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5 text-sm text-amber-200">Akun ini tidak memiliki payroll read capability.</div>;

  return <div className="space-y-6">
    <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/15 p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-emerald-400" /><div><p className="font-black text-emerald-200">Current-law official payroll only</p><p className="text-sm text-slate-400">UI ini tidak memanggil legacy <code>/calculate</code> atau <code>/finalize</code>. Verification evidence immutable, materialization explicit, final posting explicit.</p></div></div></div>

    <nav className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2"><button onClick={() => setSection('readiness')} className={`rounded-xl px-3 py-2 text-sm font-bold ${section === 'readiness' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings2 size={16} className="mr-1 inline" /> Readiness</button><button onClick={() => setSection('verification')} className={`rounded-xl px-3 py-2 text-sm font-bold ${section === 'verification' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Calculator size={16} className="mr-1 inline" /> Verify</button><button onClick={() => setSection('official')} className={`rounded-xl px-3 py-2 text-sm font-bold ${section === 'official' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><FileCheck2 size={16} className="mr-1 inline" /> Official</button></nav>

    {section === 'readiness' && <>
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={submitPeriod} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Payroll Period</h2><p className="text-sm text-slate-400">Create path diserialisasi dan menolak semua bentuk overlap.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} type="date" value={periodForm.periodStart} onChange={(e) => setPeriodForm({ ...periodForm, periodStart: e.target.value })} /><input className={inputClass} type="date" value={periodForm.periodEnd} onChange={(e) => setPeriodForm({ ...periodForm, periodEnd: e.target.value })} /><input className={inputClass} type="date" value={periodForm.payDate} onChange={(e) => setPeriodForm({ ...periodForm, payDate: e.target.value })} /><input className={inputClass} value={periodForm.description} onChange={(e) => setPeriodForm({ ...periodForm, description: e.target.value })} placeholder="Description" /></div><button disabled={working === 'period'} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Create period</button><div className="mt-5 max-h-64 space-y-2 overflow-auto">{periods.map((period) => <button type="button" key={period.id} onClick={() => setSelectedPeriodId(String(period.id))} className={`w-full rounded-xl border p-3 text-left text-sm ${period.id === Number(selectedPeriodId) ? 'border-emerald-600 bg-emerald-950/30' : 'border-slate-800 bg-slate-950'}`}><div className="flex justify-between gap-2"><span className="font-bold">{dateOnly(period.period_start)} – {dateOnly(period.period_end)}</span><span className="uppercase text-slate-500">{period.status}</span></div></button>)}</div></form>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Employee Readiness</h2><p className="text-sm text-slate-400">Verification memproses semua employee aktif; satu employee belum siap akan fail-closed seluruh run.</p></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2"><RefreshCw size={17} /></button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Employee</th><th>NIK</th><th>Basic</th><th>Statutory</th><th>Tax case</th><th>Ready</th></tr></thead><tbody>{readiness.map(({ employee, setting, ready }) => <tr key={employee.id} className="border-t border-slate-800"><td className="py-3 font-bold">{employee.employee_id} · {employee.name}</td><td>{employee.nik || <span className="text-rose-300">missing</span>}</td><td>{money(employee.basic_salary)}</td><td>{setting?.setting_id ? 'configured' : <span className="text-rose-300">missing</span>}</td><td>{setting?.tax_subjective_case || '—'}</td><td>{ready ? <BadgeCheck className="text-emerald-400" size={18} /> : <ShieldAlert className="text-amber-400" size={18} />}</td></tr>)}</tbody></table></div></div>
      </section>

      <form onSubmit={submitStatutory} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><WalletCards className="text-emerald-400" /><div><h2 className="font-black">Employee Statutory Settings</h2><p className="text-sm text-slate-400">BPJS toggles, applicable health minimum wage, JKK risk, PTKP awal tahun, tax subjective case dan zakat input.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><select className={inputClass} value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>{context.employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><input className={inputClass} type="number" min="0" value={statForm.fixedAllowanceMonthly} onChange={(e) => setStatForm({ ...statForm, fixedAllowanceMonthly: e.target.value })} placeholder="Fixed allowance/month" /><input className={inputClass} type="number" min="0" value={statForm.applicableHealthMinimumWage} onChange={(e) => setStatForm({ ...statForm, applicableHealthMinimumWage: e.target.value })} placeholder="Applicable UMK/UMP" /><select className={inputClass} value={statForm.jkkRiskLevel} onChange={(e) => setStatForm({ ...statForm, jkkRiskLevel: e.target.value })}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>JKK risk level {n}</option>)}</select><select className={inputClass} value={statForm.ptkpStatusYearStart} onChange={(e) => setStatForm({ ...statForm, ptkpStatusYearStart: e.target.value })}>{['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'].map((value) => <option key={value} value={value}>{value}</option>)}</select><select className={inputClass} value={statForm.taxSubjectiveCase} onChange={(e) => setStatForm({ ...statForm, taxSubjectiveCase: e.target.value as typeof statForm.taxSubjectiveCase })}><option value="unverified">Unverified subjective case</option><option value="full_year_same_employer">Full-year same employer</option></select><input className={inputClass} type="number" min="0" value={statForm.zakatViaEmployerMonthly} onChange={(e) => setStatForm({ ...statForm, zakatViaEmployerMonthly: e.target.value })} placeholder="Zakat via employer/month" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={statForm.bpjsEmploymentEnabled} onChange={(e) => setStatForm({ ...statForm, bpjsEmploymentEnabled: e.target.checked })} /> BPJS Employment</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={statForm.bpjsHealthEnabled} onChange={(e) => setStatForm({ ...statForm, bpjsHealthEnabled: e.target.checked })} /> BPJS Health</label></div><p className="mt-3 text-xs text-slate-500">NIK/basic salary/PTKP master tetap berasal dari existing `accounting.employees`; panel ini tidak membuat employee master paralel.</p><button disabled={working === 'statutory'} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Save statutory settings</button></form>
    </>}

    {section === 'verification' && <>
      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Verified Profile & Period</h2><div className="mt-4 space-y-3"><select className={inputClass} value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}>{periods.map((row) => <option key={row.id} value={row.id}>{dateOnly(row.period_start)} – {dateOnly(row.period_end)} · {row.status}</option>)}</select><select className={inputClass} value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}>{profiles.filter((row) => row.profile_code === 'ID-PAYROLL-2026' && row.version === 2 && ['draft','active'].includes(row.status)).map((row) => <option key={row.id} value={row.id}>{row.tenant_id == null ? 'GLOBAL REF' : 'TENANT'} · {row.profile_code} v{row.version} · {row.status}</option>)}</select>{selectedPeriod && <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"><p className="font-bold">{periodMonth(selectedPeriod) === 12 ? 'Final tax period flow (C2)' : 'Non-final tax period flow (C1)'}</p><p className="text-slate-500">Status {selectedPeriod.status} · existing runs {selectedPeriodRuns.length}</p>{periodMonth(selectedPeriod) === 12 && <p className="mt-1 text-amber-300">Prior Jan–Nov immutable runs detected: {priorRunIdsForSelectedDecember().length}/11</p>}</div>}<button disabled={working === 'verify' || !selectedPeriod || selectedPeriod.status === 'finalized'} onClick={() => void verifySelected()} className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Run verified preview</button></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Immutable Verification Runs</h2><p className="text-sm text-slate-400">Latest run per period menjadi kandidat materialization; final run dapat menjadi activation evidence.</p><div className="mt-4 max-h-[420px] space-y-3 overflow-auto">{runs.map((run) => <button key={run.id} onClick={() => setSelectedPeriodId(String(run.period_id))} className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-left text-sm"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold">Run #{run.id} · {run.tax_period_kind}</p><span className="text-xs text-slate-500">{dateTime(run.calculated_at)}</span></div><p className="text-slate-400">Period #{run.period_id} · {run.profile_code} v{run.profile_version} · {run.run_mode}</p><p className="mt-1 text-xs text-slate-500">{runEnd(run) || 'period snapshot unavailable'}</p></button>)}</div></div></section>

      <form onSubmit={submitActivation} className="rounded-2xl border border-amber-800/60 bg-amber-950/15 p-5"><div className="flex items-center gap-3"><BadgeCheck className="text-amber-400" /><div><h2 className="font-black">Controlled Tenant Profile Activation</h2><p className="text-sm text-slate-400">Hanya final verification run yang valid dapat mengaktifkan tenant-specific v2. Global reference tetap draft.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><select className={inputClass} value={activationForm.runId} onChange={(e) => setActivationForm({ ...activationForm, runId: e.target.value })}><option value="">Pilih final run</option>{finalRuns.map((run) => <option key={run.id} value={run.id}>Run #{run.id} · period #{run.period_id} · {runEnd(run)}</option>)}</select><input className={inputClass} type="date" value={activationForm.effectiveFrom} onChange={(e) => setActivationForm({ ...activationForm, effectiveFrom: e.target.value })} /></div><button disabled={working === 'activate' || !finalRuns.length} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Activate tenant profile</button>{activeTenantProfile && <p className="mt-3 text-sm font-bold text-emerald-300">Active tenant profile: #{activeTenantProfile.id} · effective {dateOnly(activeTenantProfile.effective_from)}</p>}{activations[0] && <p className="mt-1 text-xs text-slate-500">Latest activation event #{activations[0].id} · {dateTime(activations[0].activated_at)}</p>}</form>
    </>}

    {section === 'official' && <>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><form onSubmit={submitAccounting} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><Landmark className="text-violet-400" /><div><h2 className="font-black">Payroll Accounting Mapping</h2><p className="text-sm text-slate-400">Tidak ada hardcoded nomor akun. Expense harus debit-normal; payable credit-normal.</p></div></div><div className="mt-4 grid gap-3"><select className={inputClass} value={accountForm.salaryExpense} onChange={(e) => setAccountForm({ ...accountForm, salaryExpense: e.target.value })}><option value="">Salary expense account</option>{expenseAccounts.map((row) => <option key={row.id} value={row.id}>{row.account_code} · {row.account_name}</option>)}</select><select className={inputClass} value={accountForm.employerStatutoryExpense} onChange={(e) => setAccountForm({ ...accountForm, employerStatutoryExpense: e.target.value })}><option value="">Employer statutory expense</option>{expenseAccounts.map((row) => <option key={row.id} value={row.id}>{row.account_code} · {row.account_name}</option>)}</select><select className={inputClass} value={accountForm.salaryPayable} onChange={(e) => setAccountForm({ ...accountForm, salaryPayable: e.target.value })}><option value="">Salary payable</option>{payableAccounts.map((row) => <option key={row.id} value={row.id}>{row.account_code} · {row.account_name}</option>)}</select><select className={inputClass} value={accountForm.pph21Payable} onChange={(e) => setAccountForm({ ...accountForm, pph21Payable: e.target.value })}><option value="">PPh 21 payable</option>{payableAccounts.map((row) => <option key={row.id} value={row.id}>{row.account_code} · {row.account_name}</option>)}</select><select className={inputClass} value={accountForm.bpjsPayable} onChange={(e) => setAccountForm({ ...accountForm, bpjsPayable: e.target.value })}><option value="">BPJS/statutory payable</option>{payableAccounts.map((row) => <option key={row.id} value={row.id}>{row.account_code} · {row.account_name}</option>)}</select></div><button disabled={working === 'accounts'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Save accounting mapping</button>{accounting && <p className="mt-3 text-xs text-emerald-300">Mapping tersimpan untuk tenant ini.</p>}</form><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Official Period Control</h2><div className="mt-4 space-y-3"><select className={inputClass} value={selectedPeriodId} onChange={(e) => { setSelectedPeriodId(e.target.value); setDetails([]); setDetailTotals(null); }}>{periods.map((row) => <option key={row.id} value={row.id}>{dateOnly(row.period_start)} – {dateOnly(row.period_end)} · {row.status}</option>)}</select>{selectedPeriod && <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm"><p className="font-bold">Period #{selectedPeriod.id} · {selectedPeriod.status}</p><p className="mt-1 text-slate-400">Latest verification: {latestSelectedRun ? `#${latestSelectedRun.id} (${latestSelectedRun.tax_period_kind})` : 'none'}</p><p className="text-slate-400">Materialized: {selectedMaterialization ? `yes · run #${selectedMaterialization.calculation_run_id}` : 'no'} · Posted: {selectedPosting ? `yes · journal #${selectedPosting.journal_entry_id}` : 'no'}</p></div>}<div className="grid gap-2 sm:grid-cols-3"><button disabled={working !== null || !selectedPeriod || !latestSelectedRun || Boolean(selectedMaterialization) || !activeTenantProfile} onClick={() => void materializeSelected()} className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">1. Materialize</button><button disabled={working !== null || !selectedMaterialization} onClick={() => void loadDetails()} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold disabled:opacity-40">2. Review details</button><button disabled={working !== null || !selectedPeriod || selectedPeriod.status !== 'calculated' || Boolean(selectedPosting)} onClick={() => void finalizeSelected()} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">3. Finalize + GL</button></div>{!activeTenantProfile && <p className="text-xs text-amber-300">Official materialization membutuhkan tenant v2 profile aktif dari final verification evidence.</p>}</div></div></section>

      {details.length > 0 && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-400" /><div><h2 className="font-black">Official Payroll Detail Review</h2><p className="text-sm text-slate-400">Persisted detail telah membawa source calculation run/profile/version dan tidak boleh diedit silently.</p></div></div>{detailTotals && <div className="mt-4 grid gap-3 sm:grid-cols-4">{[['Gross', detailTotals.totalGross],['Deductions',detailTotals.totalDeductions],['Net',detailTotals.totalNet],['Employer cost',detailTotals.totalEmployerCost]].map(([label,value]) => <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-500">{label}</p><p className="font-black">{money(Number(value))}</p></div>)}</div>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Employee</th><th>Gross</th><th>Deductions</th><th>PPh21</th><th>Refund</th><th>Net</th><th>Evidence</th></tr></thead><tbody>{details.map((row) => <tr key={row.id} className="border-t border-slate-800"><td className="py-3 font-bold">{row.employees?.employee_id} · {row.employees?.name}</td><td>{money(row.gross_salary)}</td><td>{money(row.total_deductions)}</td><td>{money(row.pph21)}</td><td>{money(row.pph21_refund)}</td><td className="font-bold text-emerald-300">{money(row.net_salary)}</td><td className="text-xs text-slate-500">run #{row.source_calculation_run_id} · profile #{row.source_profile_id} v{row.source_profile_version}</td></tr>)}</tbody></table></div></section>}
    </>}
  </div>;
}
