import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, Download, FilePlus2, FolderPlus, Loader2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  archiveDocument,
  createDocumentFolder,
  downloadDocumentVersion,
  getDocument,
  getDocumentFolders,
  getDocuments,
  grantDocumentAccess,
  uploadDocument,
  uploadDocumentVersion,
  type BusinessDocument,
  type DocumentFolder,
} from '../../../services/productivityService';

const bytes = (value?: number) => {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export default function DocumentsWorkspace() {
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [selected, setSelected] = useState<BusinessDocument | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [share, setShare] = useState({ principalType: 'role' as 'role' | 'user', value: 'accountant', accessLevel: 'view' as 'view' | 'edit' | 'manage' });

  const load = async () => {
    setLoading(true);
    try {
      const [folderRows, documentRows] = await Promise.all([getDocumentFolders(), getDocuments(folderId)]);
      setFolders(folderRows);
      setDocuments(documentRows);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat Documents'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [folderId]);

  const activeVersions = useMemo(() => selected?.versions || [], [selected]);

  const createFolder = async (event: FormEvent) => {
    event.preventDefault(); if (!folderName.trim()) return;
    setSaving(true);
    try { await createDocumentFolder({ name: folderName.trim(), parentId: folderId }); setFolderName(''); toast.success('Folder dibuat'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal membuat folder'); }
    finally { setSaving(false); }
  };

  const submitDocument = async (event: FormEvent) => {
    event.preventDefault(); if (!file || !title.trim()) return;
    setSaving(true);
    try { await uploadDocument({ title: title.trim(), folderId, file }); setTitle(''); setFile(null); toast.success('Dokumen diunggah ke private storage'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Upload gagal'); }
    finally { setSaving(false); }
  };

  const openDocument = async (id: number) => {
    try { setSelected(await getDocument(id)); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal membuka dokumen'); }
  };

  const addVersion = async () => {
    if (!selected || !versionFile) return;
    setSaving(true);
    try { await uploadDocumentVersion(selected.id, versionFile); setVersionFile(null); setSelected(await getDocument(selected.id)); await load(); toast.success('Versi baru ditambahkan'); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Versi baru gagal'); }
    finally { setSaving(false); }
  };

  const download = async (document: BusinessDocument, version: number, filename?: string) => {
    try {
      const response = await downloadDocumentVersion(document.id, version);
      const url = URL.createObjectURL(response.data as Blob);
      const link = window.document.createElement('a');
      link.href = url; link.download = filename || document.title; link.click(); URL.revokeObjectURL(url);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Download gagal'); }
  };

  const grant = async () => {
    if (!selected) return;
    try {
      await grantDocumentAccess(selected.id, share.principalType === 'role'
        ? { principalType: 'role', roleName: share.value.trim(), accessLevel: share.accessLevel }
        : { principalType: 'user', principalUserId: Number(share.value), accessLevel: share.accessLevel });
      setSelected(await getDocument(selected.id)); toast.success('Akses diperbarui');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memberi akses'); }
  };

  const archive = async () => {
    if (!selected) return;
    try { await archiveDocument(selected.id); toast.success('Dokumen diarsipkan'); setSelected(null); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Archive gagal'); }
  };

  if (loading) return <div className="grid min-h-56 place-items-center"><Loader2 className="animate-spin" /></div>;

  return <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
    <aside className="space-y-4 rounded-2xl border bg-white p-4">
      <h2 className="font-bold">Folders</h2>
      <button type="button" onClick={() => setFolderId(null)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${folderId == null ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>All documents</button>
      {folders.map((folder) => <button key={folder.id} type="button" onClick={() => setFolderId(folder.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${folderId === folder.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}><span>{folder.name}</span><span className="text-xs opacity-60">{folder.document_count ?? 0}</span></button>)}
      <form onSubmit={createFolder} className="flex gap-2"><input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="New folder" className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm" /><button disabled={saving} className="rounded-lg border p-2"><FolderPlus size={16} /></button></form>
    </aside>

    <section className="space-y-4">
      <form onSubmit={submitDocument} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="rounded-xl border px-3 py-2.5" />
        <input required type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border px-3 py-2" />
        <button disabled={saving || !file} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><FilePlus2 size={16} />Upload</button>
      </form>
      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Document</th><th className="p-3">Version</th><th className="p-3">Type / Size</th><th className="p-3">Status</th></tr></thead>
          <tbody>{documents.map((document) => <tr key={document.id} className="cursor-pointer border-t hover:bg-slate-50" onClick={() => void openDocument(document.id)}><td className="p-3"><div className="font-semibold">{document.title}</div><div className="text-xs text-slate-500">{document.folder_name || 'Root'}</div></td><td className="p-3">v{document.current_version}</td><td className="p-3"><div>{document.mime_type || '—'}</div><div className="text-xs text-slate-500">{bytes(document.size_bytes)}</div></td><td className="p-3">{document.status}</td></tr>)}</tbody>
        </table>
        {documents.length === 0 && <p className="p-6 text-sm text-slate-500">Belum ada dokumen pada folder ini.</p>}
      </div>
    </section>

    <aside className="rounded-2xl border bg-white p-4">
      {!selected ? <p className="text-sm text-slate-500">Pilih dokumen untuk melihat version history dan access controls.</p> : <div className="space-y-5">
        <div><h2 className="text-lg font-black">{selected.title}</h2><p className="text-xs text-slate-500">Current v{selected.current_version} · {selected.status}</p></div>
        <div className="space-y-2"><h3 className="text-sm font-bold">Versions</h3>{activeVersions.map((version) => <div key={version.id} className="flex items-center justify-between rounded-xl border p-2 text-xs"><div><b>v{version.version_no}</b> · {version.original_name}<div className="text-slate-500">{bytes(version.size_bytes)} · {version.sha256.slice(0, 12)}…</div></div><button type="button" onClick={() => void download(selected, version.version_no, version.original_name)} className="rounded-lg border p-2"><Download size={14} /></button></div>)}</div>
        <div className="space-y-2"><h3 className="text-sm font-bold">Add version</h3><input type="file" onChange={(e) => setVersionFile(e.target.files?.[0] || null)} className="w-full text-xs" /><button type="button" disabled={!versionFile || saving} onClick={() => void addVersion()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50"><UploadCloud size={15} />Upload new version</button></div>
        <div className="space-y-2"><h3 className="text-sm font-bold">Grant access</h3><div className="grid grid-cols-2 gap-2"><select value={share.principalType} onChange={(e) => setShare({ ...share, principalType: e.target.value as 'role' | 'user' })} className="rounded-lg border p-2 text-sm"><option value="role">Role</option><option value="user">User ID</option></select><select value={share.accessLevel} onChange={(e) => setShare({ ...share, accessLevel: e.target.value as 'view' | 'edit' | 'manage' })} className="rounded-lg border p-2 text-sm"><option value="view">View</option><option value="edit">Edit</option><option value="manage">Manage</option></select></div><input value={share.value} onChange={(e) => setShare({ ...share, value: e.target.value })} placeholder={share.principalType === 'role' ? 'manager' : '123'} className="w-full rounded-lg border p-2 text-sm" /><button type="button" onClick={() => void grant()} className="w-full rounded-xl border px-3 py-2 text-sm font-semibold">Grant</button></div>
        <button type="button" onClick={() => void archive()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"><Archive size={15} />Archive</button>
      </div>}
    </aside>
  </div>;
}
