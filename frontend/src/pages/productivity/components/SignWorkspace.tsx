import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Loader2, PenLine, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  cancelSignatureRequest,
  createSignatureRequest,
  getDocuments,
  getSignatureRequests,
  type BusinessDocument,
  type SignatureRequest,
} from '../../../services/productivityService';

type LinkRow = { id: number; name: string; email: string; order: number; url: string };

export default function SignWorkspace() {
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [form, setForm] = useState({ documentId: '', subject: '', message: '', expiresAt: '', recipients: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [documentRows, requestRows] = await Promise.all([getDocuments(), getSignatureRequests()]);
      setDocuments(documentRows.filter((document) => document.status === 'active' && document.current_version > 0));
      setRequests(requestRows);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat Sign'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const parsedRecipients = useMemo(() => form.recipients.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [name, email] = line.split('|').map((value) => value?.trim());
    return { type: 'external' as const, name, email, signingOrder: index + 1 };
  }), [form.recipients]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.documentId || !form.subject.trim() || !parsedRecipients.length || parsedRecipients.some((recipient) => !recipient.name || !recipient.email)) {
      toast.error('Pilih dokumen dan isi recipient sebagai Nama|email per baris.'); return;
    }
    setSaving(true);
    try {
      const created = await createSignatureRequest({
        documentId: Number(form.documentId), subject: form.subject.trim(), message: form.message.trim() || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        recipients: parsedRecipients,
      });
      const origin = window.location.origin;
      setLinks((created.recipients || []).map((recipient) => ({ id: recipient.id, name: recipient.recipient_name, email: recipient.recipient_email, order: recipient.signing_order, url: `${origin}/sign#token=${encodeURIComponent(recipient.token)}` })));
      setForm({ documentId: '', subject: '', message: '', expiresAt: '', recipients: '' });
      toast.success('Signature request dibuat. Simpan link recipient sekarang; token raw tidak disimpan server.');
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal membuat signature request'); }
    finally { setSaving(false); }
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success('Signing link copied'); }
    catch { toast.error('Clipboard tidak tersedia'); }
  };

  const cancel = async (id: number) => {
    try { await cancelSignatureRequest(id); toast.success('Signature request dibatalkan'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Cancel gagal'); }
  };

  if (loading) return <div className="grid min-h-56 place-items-center"><Loader2 className="animate-spin" /></div>;

  return <div className="space-y-5">
    {links.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-bold text-amber-950">Signing links — shown for this browser session</h2>
      <p className="mt-1 text-xs text-amber-800">Server stores only SHA-256 token hashes. Link tokens use a URL fragment so they are not transmitted in HTTP requests or access logs.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">{links.map((link) => <div key={link.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">#{link.order} {link.name}</div><div className="truncate text-xs text-slate-500">{link.email}</div></div><div className="flex gap-1"><button onClick={() => void copy(link.url)} className="rounded-lg border p-2"><Copy size={14} /></button><a href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border p-2"><ExternalLink size={14} /></a></div></div>)}</div>
      <button type="button" onClick={() => setLinks([])} className="mt-3 text-xs font-semibold text-amber-900">Dismiss links</button>
    </section>}

    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5">
        <div className="flex items-center gap-2"><PenLine size={18} /><h2 className="font-bold">Create signature request</h2></div>
        <select required value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} className="w-full rounded-xl border px-3 py-2.5"><option value="">Select active document</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title} · v{document.current_version}</option>)}</select>
        <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Signature subject" className="w-full rounded-xl border px-3 py-2.5" />
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Message to signers" className="min-h-20 w-full rounded-xl border px-3 py-2.5" />
        <label className="block text-xs font-semibold text-slate-600">Expires at (optional)<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-600">Recipients in signing order<textarea required value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder={'Alice|alice@example.com\nBob|bob@example.com'} className="mt-1 min-h-32 w-full rounded-xl border px-3 py-2.5 font-mono text-xs" /></label>
        <button disabled={saving || !documents.length} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create & send'}</button>
        {!documents.length && <p className="text-xs text-amber-700">Upload an active document first.</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Request</th><th className="p-3">Document</th><th className="p-3">Progress</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id} className="border-t"><td className="p-3"><div className="font-semibold">{request.subject}</div><div className="text-xs text-slate-500">#{request.id}</div></td><td className="p-3">{request.document_title || `Document #${request.document_id}`}</td><td className="p-3">{request.signed_count ?? 0}/{request.recipient_count ?? 0}</td><td className="p-3">{request.status}</td><td className="p-3">{['draft','sent'].includes(request.status) && <button type="button" onClick={() => void cancel(request.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><XCircle size={14} />Cancel</button>}</td></tr>)}</tbody></table>
        {requests.length === 0 && <p className="p-6 text-sm text-slate-500">Belum ada signature request.</p>}
      </div>
    </div>
  </div>;
}
