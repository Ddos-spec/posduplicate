import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Globe2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWebsiteSites } from '../../services/digitalWebsiteService';
import { getMarketingEvents, getMarketingSurveys, type MarketingEvent, type MarketingSurvey } from '../../services/marketingEngagementService';

type LinkRow = { key: string; label: string; kind: 'Event' | 'Survey'; url: string };

export default function EngagementPublicLinks() {
  const [publicSlug, setPublicSlug] = useState('');
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [surveys, setSurveys] = useState<MarketingSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getWebsiteSites(), getMarketingEvents(), getMarketingSurveys()])
      .then(([sites, eventRows, surveyRows]) => {
        if (!active) return;
        const site = sites.find((candidate) => candidate.status === 'published');
        setPublicSlug(site?.public_slug || '');
        setEvents(eventRows);
        setSurveys(surveyRows);
      })
      .catch(() => { if (active) toast.error('Gagal memuat public engagement links'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo<LinkRow[]>(() => {
    if (!publicSlug) return [];
    const origin = window.location.origin;
    return [
      ...events.filter((event) => event.status === 'published').map((event) => ({
        key: `event-${event.id}`, label: event.name, kind: 'Event' as const,
        url: `${origin}/store/${encodeURIComponent(publicSlug)}?event=${encodeURIComponent(event.slug)}`,
      })),
      ...surveys.filter((survey) => survey.status === 'published').map((survey) => ({
        key: `survey-${survey.id}`, label: survey.title, kind: 'Survey' as const,
        url: `${origin}/store/${encodeURIComponent(publicSlug)}?survey=${encodeURIComponent(survey.slug)}`,
      })),
    ];
  }, [events, publicSlug, surveys]);

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success('Public link copied'); }
    catch { toast.error('Browser tidak mengizinkan clipboard'); }
  };

  if (loading) return null;
  if (!publicSlug) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Publish satu Website site dulu untuk membuat public Event/Survey link.</div>;
  if (!rows.length) return null;

  return <div className="rounded-2xl border bg-white p-4">
    <div className="flex items-center gap-2 font-bold"><Globe2 size={17} /> Public links</div>
    <div className="mt-3 grid gap-2 md:grid-cols-2">{rows.map((row) => <div key={row.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
      <div className="min-w-0"><div className="text-xs font-bold uppercase text-blue-600">{row.kind}</div><div className="truncate text-sm font-semibold">{row.label}</div></div>
      <div className="flex gap-1">
        <button type="button" onClick={() => void copy(row.url)} className="rounded-lg border p-2" title="Copy link"><Copy size={15} /></button>
        <a href={row.url} target="_blank" rel="noreferrer" className="rounded-lg border p-2" title="Open public page"><ExternalLink size={15} /></a>
      </div>
    </div>)}</div>
  </div>;
}
