import { type FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, PenLine, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  declinePublicSignatureRequest,
  downloadPublicSignatureDocument,
  getPublicSignatureRequest,
  signPublicSignatureRequest,
  type PublicSignatureRequest,
} from '../services/productivityService';

export default function PublicSignPage() {
  const { token = '' } = useParams();
  const [request, setRequest] = useState<PublicSignatureRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setRequest(await getPublicSignatureRequest(token)); }
    catch (requestError: any) { setError(requestError?.response?.data?.error?.message || 'Signature request tidak tersedia.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [token]);

  const download = async () => {
    if (!request) return;
    try {
      const response = await downloadPublicSignatureDocument(token);
      const url = URL.createObjectURL(response.data as Blob);
      const link = window.document.createElement('a'); link.href = url; link.download = request.document.original_name; link.click(); URL.revokeObjectURL(url);
    } catch (requestError: any) { setError(requestError?.response?.data?.error?.message || 'Dokumen tidak dapat diunduh.'); }
  };

  const sign = async (event: FormEvent) => {
    event.preventDefault(); if (!signatureName.trim() || !consentAccepted) return;
    setSubmitting(true); setError('');
    try {
      const result = await signPublicSignatureRequest(token, { signatureName: signatureName.trim(), consentAccepted: true });
      setSuccess(`Signed. Evidence hash: ${result.evidence_hash}`); await load();
    } catch (requestError: any) { setError(requestError?.response?.data?.error?.message || 'Signature gagal diproses.'); }
    finally { setSubmitting(false); }
  };

  const decline = async () => {
    setSubmitting(true); setError('');
    try { await declinePublicSignatureRequest(token); setSuccess('Signature request declined.'); await load(); }
    catch (requestError: any) { setError(requestError?.response?.data?.error?.message || 'Decline gagal diproses.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin" /></main>;
  if (!request) return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="max-w-lg rounded-3xl border bg-white p-7 text-center"><h1 className="text-xl font-black">Signature unavailable</h1><p className="mt-2 text-sm text-slate-600">{error}</p></div></main>;

  const terminal = request.recipient_status !== 'pending';
  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Electronic Signature</p>
        <h1 className="mt-2 text-3xl font-black">{request.subject}</h1>
        {request.message && <p className="mt-3 text-slate-600">{request.message}</p>}
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="font-bold">{request.document.title}</div>
          <div className="mt-1 text-slate-600">Version {request.document.version} · {request.document.original_name}</div>
          <div className="mt-1 break-all font-mono text-[11px] text-slate-500">SHA-256 {request.document.sha256}</div>
          <button onClick={() => void download()} type="button" className="mt-3 inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 font-semibold"><Download size={15} />Download exact version</button>
        </div>
      </header>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><PenLine size={18} /><h2 className="font-black">Signer</h2></div>
        <p className="mt-2 text-sm text-slate-600">{request.recipient_name} · {request.recipient_email} · order #{request.signing_order}</p>
        {terminal ? <div className={`mt-5 rounded-2xl p-4 ${request.recipient_status === 'signed' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}><div className="flex items-center gap-2 font-bold">{request.recipient_status === 'signed' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{request.recipient_status}</div></div> : <form onSubmit={sign} className="mt-5 space-y-4">
          <input required value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Type your full legal name" className="w-full rounded-xl border px-3 py-3 text-lg font-semibold" />
          <label className="flex items-start gap-3 rounded-2xl border p-4 text-sm"><input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} className="mt-1" /><span>{request.consent_text}</span></label>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {success && <p className="break-all rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{success}</p>}
          <div className="grid gap-3 sm:grid-cols-2"><button disabled={submitting || !signatureName.trim() || !consentAccepted} className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{submitting ? 'Processing…' : 'Sign document'}</button><button type="button" disabled={submitting} onClick={() => void decline()} className="rounded-xl border border-rose-200 px-4 py-3 font-bold text-rose-700 disabled:opacity-50">Decline</button></div>
        </form>}
        {success && terminal && <p className="mt-4 break-all rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{success}</p>}
      </section>
      <p className="text-center text-xs text-slate-500">This workflow records a typed electronic acknowledgement and SHA-256 evidence for the exact immutable document version shown above.</p>
    </div>
  </main>;
}
