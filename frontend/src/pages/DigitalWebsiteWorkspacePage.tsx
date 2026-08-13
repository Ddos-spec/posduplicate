import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { getWebsiteSites, type WebsiteSite } from '../services/digitalWebsiteService';
import SiteManager from './digital/SiteManager';
import PageManager from './digital/PageManager';
import CatalogManager from './digital/CatalogManager';
import EcommerceOrderManager from './digital/EcommerceOrderManager';

export default function DigitalWebsiteWorkspacePage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<WebsiteSite[]>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const selected = useMemo(() => sites.find((site) => site.id === siteId) ?? null, [siteId, sites]);

  const reload = async () => {
    const rows = await getWebsiteSites();
    setSites(rows);
    setSiteId((current) => current && rows.some((site) => site.id === current) ? current : rows[0]?.id ?? null);
  };

  useEffect(() => {
    let active = true;
    getWebsiteSites().then((rows) => {
      if (!active) return;
      setSites(rows); setSiteId(rows[0]?.id ?? null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;

  return <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/module-selector')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={16} />Suite</button>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-blue-600">P3 DIGITAL BUSINESS</p><h1 className="text-3xl font-black">Website & Storefront</h1><p className="mt-2 text-slate-600">CMS, publication workflow, catalog projection, checkout, dan fulfillment order tanpa product master paralel.</p></div>{selected?.status === 'published' && <button onClick={() => window.open(`/store/${selected.public_slug}`, '_blank', 'noopener,noreferrer')} className="rounded-lg border bg-white px-3 py-2 text-sm font-bold"><ExternalLink className="inline h-4 w-4" /> Public preview</button>}</div>
      <div className="mt-6"><SiteManager sites={sites} selectedId={siteId} onSelect={setSiteId} reload={reload} /></div>
      {siteId && <div className="mt-5 grid gap-5 lg:grid-cols-2"><PageManager siteId={siteId} /><CatalogManager siteId={siteId} /></div>}
      <div className="mt-5"><EcommerceOrderManager /></div>
    </div>
  </div>;
}
