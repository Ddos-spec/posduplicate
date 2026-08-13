import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getWebsiteSites, type WebsiteSite } from '../services/digitalWebsiteService';

export default function DigitalWebsiteWorkspacePage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<WebsiteSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getWebsiteSites()
      .then((rows) => { if (active) setSites(rows); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;

  return <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/module-selector')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={16} />Suite</button>
      <h1 className="text-3xl font-black">Website & Storefront</h1>
      <p className="mt-2 text-slate-600">P3 CMS workspace. Public storefronts resolve tenant context from globally unique public slugs.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => <article key={site.id} className="rounded-2xl border bg-white p-4"><h2 className="font-black">{site.name}</h2><p className="mt-1 text-sm text-slate-500">/{site.public_slug} · {site.status}</p></article>)}
        {!sites.length && <p className="text-slate-500">Belum ada website.</p>}
      </div>
    </div>
  </div>;
}
