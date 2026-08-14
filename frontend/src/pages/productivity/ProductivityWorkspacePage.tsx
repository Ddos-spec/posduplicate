import { useSearchParams } from 'react-router-dom';
import { BookOpen, Files, PenLine } from 'lucide-react';
import DocumentsWorkspace from './components/DocumentsWorkspace';
import KnowledgeWorkspace from './components/KnowledgeWorkspace';
import SignWorkspace from './components/SignWorkspace';

type Tab = 'documents' | 'knowledge' | 'sign';

export default function ProductivityWorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const active: Tab = tabParam === 'knowledge' || tabParam === 'sign' ? tabParam : 'documents';
  const tabs: Array<{ id: Tab; label: string; icon: typeof Files }> = [
    { id: 'documents', label: 'Documents', icon: Files },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'sign', label: 'Sign', icon: PenLine },
  ];

  return <div className="min-h-screen bg-slate-50 p-5 md:p-7">
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Productivity & Governance</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Documents, Knowledge & Sign</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Private document versions, tenant knowledge, and version-pinned electronic acknowledgement workflows.</p>
      </header>
      <div className="inline-flex flex-wrap rounded-2xl bg-slate-200/70 p-1">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSearchParams(id === 'documents' ? {} : { tab: id })} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${active === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}><Icon size={16} />{label}</button>)}
      </div>
      {active === 'documents' ? <DocumentsWorkspace /> : active === 'knowledge' ? <KnowledgeWorkspace /> : <SignWorkspace />}
    </div>
  </div>;
}
