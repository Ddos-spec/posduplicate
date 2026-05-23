import { type ComponentType, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Globe2,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  PlaySquare,
  Send,
  ShieldCheck,
  Settings2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  ART_STYLES,
  ASPECT_RATIOS,
  CAMPAIGN_GOALS,
  CONTENT_STUDIO_STORAGE_KEY,
  CONTENT_TYPES,
  COPY_TONES,
  PROVIDER_IDS,
  PROVIDER_META,
  VIDEO_DURATIONS,
  VIDEO_MOTIONS,
  buildPreviewSvg,
  createCampaignFallback,
  createChatFallback,
  createCopyFallback,
  createDefaultProviderConfigs,
  createImageFallback,
  createVideoFallback,
  downloadTextFile,
  requestProviderText,
  type AspectRatio,
  type ContentType,
  type ProviderConfigMap,
  type ProviderId,
} from '../../lib/contentStudio';
import FieldHelp from './FieldHelp';

type StudioTab = 'copy' | 'image' | 'video' | 'campaign' | 'copilot' | 'provider';

type PersistedStudioState = {
  activeTab?: StudioTab;
  providerId?: ProviderId;
  providerConfigs?: Partial<ProviderConfigMap>;
  copyPrompt?: string;
  copyTone?: string;
  copyType?: string;
  copyOutput?: string;
  imagePrompt?: string;
  negativePrompt?: string;
  artStyle?: string;
  aspectRatio?: string;
  imageOutput?: string;
  videoIdea?: string;
  videoMotion?: string;
  videoDuration?: string;
  videoPlatform?: string;
  videoOutput?: string;
  campaignProduct?: string;
  campaignOffer?: string;
  campaignAudience?: string;
  campaignGoal?: string;
  campaignOutput?: string;
  copilotInput?: string;
  copilotOutput?: string;
};

const tabs: Array<{ id: StudioTab; label: string; helper: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'copy', label: 'Copy Lab', helper: 'Caption & hook', icon: Wand2 },
  { id: 'image', label: 'Visual Brief', helper: 'Foto / key visual', icon: ImageIcon },
  { id: 'video', label: 'Motion Board', helper: 'Storyboard video', icon: PlaySquare },
  { id: 'campaign', label: 'Campaign', helper: 'Blueprint funnel', icon: Send },
  { id: 'copilot', label: 'Copilot', helper: 'Bantu brainstorming', icon: Bot },
  { id: 'provider', label: 'Pilot Config', helper: 'Provider & model', icon: Settings2 },
];

function mergeProviderConfigs(source?: Partial<ProviderConfigMap>): ProviderConfigMap {
  const defaults = createDefaultProviderConfigs();
  if (!source) return defaults;
  return PROVIDER_IDS.reduce((acc, providerId) => {
    acc[providerId] = {
      ...defaults[providerId],
      ...(source[providerId] ?? {}),
    };
    return acc;
  }, {} as ProviderConfigMap);
}

function maskSecret(value: string) {
  if (!value) return 'Belum diisi';
  if (value.length <= 8) return 'Tersimpan';
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}

function ChoicePill({
  active,
  label,
  onClick,
  isDark,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? isDark
            ? 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/40'
            : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
          : isDark
            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function OutputCard({
  isDark,
  title,
  content,
  onCopy,
  onDownload,
  onApply,
  applyLabel = 'Pakai ke composer',
}: {
  isDark: boolean;
  title: string;
  content: string;
  onCopy: () => void;
  onDownload: () => void;
  onApply?: () => void;
  applyLabel?: string;
}) {
  return (
    <div className={`rounded-[28px] p-5 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{title}</p>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Output ini sengaja advanced — hasil akhir tetap bergantung pada taste dan eksekusi pilot.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCopy} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Copy size={14} />
            Copy
          </button>
          <button type="button" onClick={onDownload} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            <Download size={14} />
            Download
          </button>
          {onApply ? (
            <button type="button" onClick={onApply} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              <CheckCircle2 size={14} />
              {applyLabel}
            </button>
          ) : null}
        </div>
      </div>
      <pre className={`whitespace-pre-wrap text-sm leading-6 font-sans ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{content}</pre>
    </div>
  );
}

export default function AdvancedContentStudio({
  isDark,
  onApplyToComposer,
  preferredTab,
}: {
  isDark: boolean;
  onApplyToComposer: (text: string) => void;
  preferredTab?: StudioTab;
}) {
  const [activeTab, setActiveTab] = useState<StudioTab>('copy');
  const [providerId, setProviderId] = useState<ProviderId>('demo');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigMap>(createDefaultProviderConfigs());

  const [copyType, setCopyType] = useState<ContentType>('Caption Instagram');
  const [copyTone, setCopyTone] = useState<(typeof COPY_TONES)[number]>('Tajam & meyakinkan');
  const [copyPrompt, setCopyPrompt] = useState('');
  const [copyOutput, setCopyOutput] = useState('');

  const [imagePrompt, setImagePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blur, low contrast, muddy colors, awkward anatomy, cluttered frame');
  const [artStyle, setArtStyle] = useState<(typeof ART_STYLES)[number]>('Cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [imageOutput, setImageOutput] = useState('');

  const [videoIdea, setVideoIdea] = useState('');
  const [videoMotion, setVideoMotion] = useState<(typeof VIDEO_MOTIONS)[number]>('Slow dolly in');
  const [videoDuration, setVideoDuration] = useState<(typeof VIDEO_DURATIONS)[number]>('30 detik');
  const [videoPlatform, setVideoPlatform] = useState('Instagram Reels');
  const [videoOutput, setVideoOutput] = useState('');

  const [campaignProduct, setCampaignProduct] = useState('');
  const [campaignOffer, setCampaignOffer] = useState('');
  const [campaignAudience, setCampaignAudience] = useState('');
  const [campaignGoal, setCampaignGoal] = useState<(typeof CAMPAIGN_GOALS)[number]>('Konversi');
  const [campaignOutput, setCampaignOutput] = useState('');

  const [copilotInput, setCopilotInput] = useState('');
  const [copilotOutput, setCopilotOutput] = useState('');

  const [loadingKey, setLoadingKey] = useState<null | 'copy' | 'image' | 'video' | 'campaign' | 'copilot'>(null);
  const fieldClass = isDark
    ? 'w-full rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(CONTENT_STUDIO_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedStudioState;
      if (saved.activeTab) setActiveTab(saved.activeTab);
      if (saved.providerId && PROVIDER_IDS.includes(saved.providerId)) setProviderId(saved.providerId);
      setProviderConfigs(mergeProviderConfigs(saved.providerConfigs));
      if (saved.copyType && CONTENT_TYPES.includes(saved.copyType as ContentType)) setCopyType(saved.copyType as ContentType);
      if (saved.copyTone && COPY_TONES.includes(saved.copyTone as (typeof COPY_TONES)[number])) setCopyTone(saved.copyTone as (typeof COPY_TONES)[number]);
      if (typeof saved.copyPrompt === 'string') setCopyPrompt(saved.copyPrompt);
      if (typeof saved.copyOutput === 'string') setCopyOutput(saved.copyOutput);
      if (typeof saved.imagePrompt === 'string') setImagePrompt(saved.imagePrompt);
      if (typeof saved.negativePrompt === 'string') setNegativePrompt(saved.negativePrompt);
      if (saved.artStyle && ART_STYLES.includes(saved.artStyle as (typeof ART_STYLES)[number])) setArtStyle(saved.artStyle as (typeof ART_STYLES)[number]);
      if (saved.aspectRatio && ASPECT_RATIOS.includes(saved.aspectRatio as AspectRatio)) setAspectRatio(saved.aspectRatio as AspectRatio);
      if (typeof saved.imageOutput === 'string') setImageOutput(saved.imageOutput);
      if (typeof saved.videoIdea === 'string') setVideoIdea(saved.videoIdea);
      if (saved.videoMotion && VIDEO_MOTIONS.includes(saved.videoMotion as (typeof VIDEO_MOTIONS)[number])) setVideoMotion(saved.videoMotion as (typeof VIDEO_MOTIONS)[number]);
      if (saved.videoDuration && VIDEO_DURATIONS.includes(saved.videoDuration as (typeof VIDEO_DURATIONS)[number])) setVideoDuration(saved.videoDuration as (typeof VIDEO_DURATIONS)[number]);
      if (typeof saved.videoPlatform === 'string') setVideoPlatform(saved.videoPlatform);
      if (typeof saved.videoOutput === 'string') setVideoOutput(saved.videoOutput);
      if (typeof saved.campaignProduct === 'string') setCampaignProduct(saved.campaignProduct);
      if (typeof saved.campaignOffer === 'string') setCampaignOffer(saved.campaignOffer);
      if (typeof saved.campaignAudience === 'string') setCampaignAudience(saved.campaignAudience);
      if (saved.campaignGoal && CAMPAIGN_GOALS.includes(saved.campaignGoal as (typeof CAMPAIGN_GOALS)[number])) setCampaignGoal(saved.campaignGoal as (typeof CAMPAIGN_GOALS)[number]);
      if (typeof saved.campaignOutput === 'string') setCampaignOutput(saved.campaignOutput);
      if (typeof saved.copilotInput === 'string') setCopilotInput(saved.copilotInput);
      if (typeof saved.copilotOutput === 'string') setCopilotOutput(saved.copilotOutput);
    } catch {
      // ignore local parsing error
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: PersistedStudioState = {
      activeTab,
      providerId,
      providerConfigs,
      copyPrompt,
      copyTone,
      copyType,
      copyOutput,
      imagePrompt,
      negativePrompt,
      artStyle,
      aspectRatio,
      imageOutput,
      videoIdea,
      videoMotion,
      videoDuration,
      videoPlatform,
      videoOutput,
      campaignProduct,
      campaignOffer,
      campaignAudience,
      campaignGoal,
      campaignOutput,
      copilotInput,
      copilotOutput,
    };
    window.localStorage.setItem(CONTENT_STUDIO_STORAGE_KEY, JSON.stringify(payload));
  }, [
    activeTab, providerId, providerConfigs,
    copyPrompt, copyTone, copyType, copyOutput,
    imagePrompt, negativePrompt, artStyle, aspectRatio, imageOutput,
    videoIdea, videoMotion, videoDuration, videoPlatform, videoOutput,
    campaignProduct, campaignOffer, campaignAudience, campaignGoal, campaignOutput,
    copilotInput, copilotOutput,
  ]);

  useEffect(() => {
    if (!preferredTab) return;
    setActiveTab(preferredTab);
  }, [preferredTab]);

  const providerMeta = PROVIDER_META[providerId];
  const providerConfig = providerConfigs[providerId];
  const imagePreview = useMemo(
    () => buildPreviewSvg(imagePrompt || 'Visual direction', `${artStyle} · ${aspectRatio}`, 'Image Brief', `${imagePrompt}-${artStyle}-${aspectRatio}`),
    [imagePrompt, artStyle, aspectRatio],
  );
  const videoPreview = useMemo(
    () => buildPreviewSvg(videoIdea || 'Motion storyboard', `${videoPlatform} · ${videoMotion}`, 'Video Board', `${videoIdea}-${videoPlatform}-${videoMotion}`),
    [videoIdea, videoPlatform, videoMotion],
  );
  const studioStats = useMemo(() => ([
    { label: 'Mode', value: providerMeta.label, detail: providerId === 'demo' ? 'Belajar tanpa biaya token' : providerMeta.badge },
    { label: 'Tabs aktif', value: '5+', detail: 'Copy, image, video, campaign, copilot' },
    { label: 'Pilot note', value: 'Advanced', detail: 'Hasil bergantung prompt & taste user' },
  ]), [providerMeta.label, providerMeta.badge, providerId]);

  const updateProviderConfig = (patch: Partial<ProviderConfigMap[ProviderId]>) => {
    setProviderConfigs((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        ...patch,
      },
    }));
  };

  const runCopy = async () => {
    if (!copyPrompt.trim()) {
      toast.error('Isi brief dulu untuk Copy Lab.');
      return;
    }
    setLoadingKey('copy');
    try {
      const result = providerId === 'demo'
        ? createCopyFallback(copyType, copyTone, copyPrompt)
        : await requestProviderText({
            providerId,
            config: providerConfig,
            messages: [
              {
                role: 'system',
                content: 'Anda adalah content strategist senior. Tulis output dalam Bahasa Indonesia yang langsung bisa dipakai, rapi, ringkas, dan kuat secara marketing.',
              },
              {
                role: 'user',
                content: `Buat ${copyType} dengan tone ${copyTone}. Brief: ${copyPrompt}. Berikan hook utama, draft inti, 3 alternatif hook, dan CTA penutup.`,
              },
            ],
          });
      setCopyOutput(result);
      setActiveTab('copy');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat copy.');
    } finally {
      setLoadingKey(null);
    }
  };

  const runImageBrief = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Isi ide visual dulu.');
      return;
    }
    setLoadingKey('image');
    try {
      const result = providerId === 'demo'
        ? createImageFallback(imagePrompt, 'Studio Visual', artStyle, aspectRatio, negativePrompt)
        : await requestProviderText({
            providerId,
            config: providerConfig,
            messages: [
              {
                role: 'system',
                content: 'Anda adalah creative director untuk iklan visual. Susun output dalam Bahasa Indonesia dengan struktur prompt, negative prompt, camera, lighting, dan production notes.',
              },
              {
                role: 'user',
                content: `Buat visual brief untuk ide: ${imagePrompt}. Style: ${artStyle}. Aspect ratio: ${aspectRatio}. Negative prompt: ${negativePrompt}. Fokus ke foto/hero visual yang siap dieksekusi tim desain atau image generator.`,
              },
            ],
          });
      setImageOutput(result);
      setActiveTab('image');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat visual brief.');
    } finally {
      setLoadingKey(null);
    }
  };

  const runVideoBoard = async () => {
    if (!videoIdea.trim()) {
      toast.error('Isi ide video dulu.');
      return;
    }
    setLoadingKey('video');
    try {
      const result = providerId === 'demo'
        ? createVideoFallback(videoIdea, videoMotion, videoDuration, videoPlatform)
        : await requestProviderText({
            providerId,
            config: providerConfig,
            messages: [
              {
                role: 'system',
                content: 'Anda adalah director untuk short-form video ads. Tulis storyboard ringkas dalam Bahasa Indonesia dengan opening hook, beat sheet, camera motion, overlay text, dan CTA visual.',
              },
              {
                role: 'user',
                content: `Buat storyboard video untuk ide: ${videoIdea}. Platform: ${videoPlatform}. Motion: ${videoMotion}. Durasi: ${videoDuration}.`,
              },
            ],
          });
      setVideoOutput(result);
      setActiveTab('video');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat storyboard video.');
    } finally {
      setLoadingKey(null);
    }
  };

  const runCampaign = async () => {
    if (!campaignProduct.trim()) {
      toast.error('Isi produk atau link dulu.');
      return;
    }
    setLoadingKey('campaign');
    try {
      const result = providerId === 'demo'
        ? createCampaignFallback(campaignProduct, campaignOffer, campaignAudience, campaignGoal)
        : await requestProviderText({
            providerId,
            config: providerConfig,
            messages: [
              {
                role: 'system',
                content: 'Anda adalah strategist performance marketing. Tulis blueprint dalam Bahasa Indonesia yang actionable: angle, offer frame, asset stack, CTA, dan next experiment.',
              },
              {
                role: 'user',
                content: `Buat campaign blueprint untuk produk/link ${campaignProduct}. Offer: ${campaignOffer}. Audience: ${campaignAudience}. Goal: ${campaignGoal}.`,
              },
            ],
          });
      setCampaignOutput(result);
      setActiveTab('campaign');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat campaign blueprint.');
    } finally {
      setLoadingKey(null);
    }
  };

  const runCopilot = async () => {
    if (!copilotInput.trim()) {
      toast.error('Isi pertanyaan atau konteks dulu.');
      return;
    }
    setLoadingKey('copilot');
    try {
      const result = providerId === 'demo'
        ? createChatFallback(copilotInput)
        : await requestProviderText({
            providerId,
            config: providerConfig,
            messages: [
              {
                role: 'system',
                content: 'Anda adalah creative copilot untuk content operator senior. Balas singkat, to the point, dan fokus memberi next-step yang konkret.',
              },
              {
                role: 'user',
                content: copilotInput,
              },
            ],
          });
      setCopilotOutput(result);
      setActiveTab('copilot');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menjalankan copilot.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleCopy = async (value: string, successLabel: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successLabel);
    } catch {
      toast.error('Gagal copy ke clipboard.');
    }
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-200">
              <Sparkles size={14} />
              Content Studio Advanced
            </div>
            <div className="flex items-start gap-2">
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Cockpit untuk pilot konten yang mau ngulik sendiri</h2>
              <FieldHelp
                title="Content Studio Advanced"
                description="Ini cockpit utama untuk meracik copy, visual brief, storyboard video, blueprint campaign, sampai konfigurasi provider AI."
                howToUse="Pilih tool dari sidebar kiri, isi brief atau prompt sesuai tujuan, generate output, lalu copy atau lempar ke composer publish di panel kanan halaman create content."
              />
            </div>
            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Halaman ini sengaja dibuat advanced. Sistem membantu bikin brief, storyboard, dan blueprint — tapi hasil bagus tetap murni bergantung prompt, taste, dan konfigurasi pilot.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-full 2xl:w-[360px]">
            {studioStats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/70 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-100'}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                <p className="mt-2 text-lg font-bold">{stat.value}</p>
                <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`rounded-[28px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
          <div className="mb-3 flex items-center gap-2">
            <p className={`text-[11px] uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Studio tools</p>
            <FieldHelp
              title="Studio tools"
              description="Ini daftar mode kerja di dalam cockpit, mulai dari copy, visual, video, campaign, copilot, sampai provider config."
              howToUse="Klik salah satu tool sesuai kebutuhan. Kalau butuh caption pilih Copy Lab, kalau butuh gambar pilih Visual Brief, kalau butuh video pilih Motion Board, dan seterusnya."
            />
          </div>
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-2xl p-3 text-left transition ${
                    active
                      ? isDark
                        ? 'bg-blue-500/15 ring-1 ring-blue-400/30'
                        : 'bg-blue-50 ring-1 ring-blue-200'
                      : isDark
                        ? 'hover:bg-slate-900'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-xl p-2 ${active ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{tab.label}</p>
                      <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tab.helper}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className={`mt-4 rounded-2xl p-4 text-xs leading-5 ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
            <strong>Catatan:</strong> konfigurasi provider disimpan lokal di browser seat ini. Jadi tiap pilot bisa punya style, key, dan model sendiri.
          </div>
        </aside>

        <div className={`rounded-[28px] p-5 md:p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
          {activeTab === 'copy' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-xl font-bold">Copy Lab</h3>
                    <FieldHelp
                      title="Copy Lab"
                      description="Fitur ini dipakai untuk membuat caption, hook, CTA, dan sudut copywriting yang siap masuk composer."
                      howToUse="Pilih content type dan tone dulu, isi brief dengan produk, offer, dan angle yang diinginkan, lalu klik Generate copy. Kalau hasilnya cocok, copy atau kirim ke composer."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bikin caption, hook, dan CTA yang lebih siap pakai untuk composer.</p>
                </div>
                <button type="button" onClick={() => void runCopy()} disabled={loadingKey !== null} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                  {loadingKey === 'copy' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generate copy
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((item) => (
                  <ChoicePill key={item} active={copyType === item} label={item} onClick={() => setCopyType(item)} isDark={isDark} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {COPY_TONES.map((item) => (
                  <ChoicePill key={item} active={copyTone === item} label={item} onClick={() => setCopyTone(item)} isDark={isDark} />
                ))}
              </div>
              <textarea value={copyPrompt} onChange={(e) => setCopyPrompt(e.target.value)} rows={6} placeholder="Tulis brief, angle, offer, dan hasil yang ingin dipaksa keluar dari audiens..." className={`${fieldClass} min-h-[150px] resize-y leading-6`} />
              {copyOutput ? (
                <OutputCard
                  isDark={isDark}
                  title="Copy output"
                  content={copyOutput}
                  onCopy={() => void handleCopy(copyOutput, 'Copy output disalin.')}
                  onDownload={() => downloadTextFile('copy-lab-output.txt', copyOutput)}
                  onApply={() => onApplyToComposer(copyOutput)}
                />
              ) : null}
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-xl font-bold">Visual Brief</h3>
                    <FieldHelp
                      title="Visual Brief"
                      description="Fitur ini dipakai untuk menyusun prompt visual, art direction, ratio, dan negative prompt untuk kebutuhan foto atau image generation."
                      howToUse="Isi visual utama yang diinginkan, negative prompt, style, dan rasio. Lalu generate visual brief untuk diberikan ke tim desain atau generator gambar."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bangun prompt dan direction foto / hero visual sebelum dieksekusi di generator atau tim desain.</p>
                </div>
                <button type="button" onClick={() => void runImageBrief()} disabled={loadingKey !== null} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                  {loadingKey === 'image' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generate visual brief
                </button>
              </div>

              <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={5} placeholder="Contoh: sedan hitam premium di jalan basah malam hari, city glow, cocok untuk hero rental mobil..." className={`${fieldClass} min-h-[132px] resize-y leading-6`} />
                  <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={3} placeholder="Negative prompt" className={`${fieldClass} min-h-[92px] resize-y leading-6`} />
                  <div className="flex flex-wrap gap-2">
                    {ART_STYLES.map((item) => <ChoicePill key={item} active={artStyle === item} label={item} onClick={() => setArtStyle(item)} isDark={isDark} />)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((item) => <ChoicePill key={item} active={aspectRatio === item} label={item} onClick={() => setAspectRatio(item)} isDark={isDark} />)}
                  </div>
                </div>

                <div className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <img src={imagePreview} alt="Visual preview" className="w-full rounded-[24px] object-cover shadow-sm" />
                  <p className={`mt-3 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Preview ini hanya mood board visual. Output utama tetap berupa brief yang nanti dieksekusi pilot / designer / generator.
                  </p>
                </div>
              </div>

              {imageOutput ? (
                <OutputCard
                  isDark={isDark}
                  title="Visual direction"
                  content={imageOutput}
                  onCopy={() => void handleCopy(imageOutput, 'Visual brief disalin.')}
                  onDownload={() => downloadTextFile('visual-brief.txt', imageOutput)}
                />
              ) : null}
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-xl font-bold">Motion Board</h3>
                    <FieldHelp
                      title="Motion Board"
                      description="Fitur ini dipakai untuk menyusun storyboard video pendek, urutan beat, motion, durasi, dan platform target."
                      howToUse="Isi ide video, pilih motion dan durasi, tentukan platform, lalu generate storyboard. Gunakan hasilnya sebagai panduan editor atau generator video."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Susun storyboard video pendek, beat sheet, dan overlay sebelum produksi.</p>
                </div>
                <button type="button" onClick={() => void runVideoBoard()} disabled={loadingKey !== null} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                  {loadingKey === 'video' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generate storyboard
                </button>
              </div>

              <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <textarea value={videoIdea} onChange={(e) => setVideoIdea(e.target.value)} rows={5} placeholder="Contoh: video hook calon driver rental, buka dengan mobil premium + syarat daftar paling penting..." className={`${fieldClass} min-h-[132px] resize-y leading-6`} />
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_MOTIONS.map((item) => <ChoicePill key={item} active={videoMotion === item} label={item} onClick={() => setVideoMotion(item)} isDark={isDark} />)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_DURATIONS.map((item) => <ChoicePill key={item} active={videoDuration === item} label={item} onClick={() => setVideoDuration(item)} isDark={isDark} />)}
                  </div>
                  <input value={videoPlatform} onChange={(e) => setVideoPlatform(e.target.value)} placeholder="Platform target, misal Instagram Reels / TikTok / YouTube Shorts" className={fieldClass} />
                </div>
                <div className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <img src={videoPreview} alt="Video preview" className="w-full rounded-[24px] object-cover shadow-sm" />
                  <p className={`mt-3 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Ini preview mood board motion. Output utamanya tetap storyboard teks agar pilot bebas eksekusi dengan tools video apa pun.
                  </p>
                </div>
              </div>

              {videoOutput ? (
                <OutputCard
                  isDark={isDark}
                  title="Storyboard output"
                  content={videoOutput}
                  onCopy={() => void handleCopy(videoOutput, 'Storyboard disalin.')}
                  onDownload={() => downloadTextFile('video-storyboard.txt', videoOutput)}
                />
              ) : null}
            </div>
          )}

          {activeTab === 'campaign' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-xl font-bold">Campaign Blueprint</h3>
                    <FieldHelp
                      title="Campaign Blueprint"
                      description="Fitur ini dipakai untuk memetakan offer, audience, objective, CTA, dan blueprint funnel sebelum campaign dibuat."
                      howToUse="Isi produk, offer, audience, dan goal campaign. Generate blueprint, lalu pakai hasilnya untuk menyusun caption awal, asset list, atau lane planner."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Susun angle, offer, asset stack, dan CTA sebelum produksi campaign besar.</p>
                </div>
                <button type="button" onClick={() => void runCampaign()} disabled={loadingKey !== null} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                  {loadingKey === 'campaign' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generate blueprint
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input value={campaignProduct} onChange={(e) => setCampaignProduct(e.target.value)} placeholder="Produk, landing page, atau link offer" className={fieldClass} />
                <input value={campaignOffer} onChange={(e) => setCampaignOffer(e.target.value)} placeholder="Offer utama / promise paling keras" className={fieldClass} />
                <input value={campaignAudience} onChange={(e) => setCampaignAudience(e.target.value)} placeholder="Audience target" className={fieldClass} />
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_GOALS.map((item) => <ChoicePill key={item} active={campaignGoal === item} label={item} onClick={() => setCampaignGoal(item)} isDark={isDark} />)}
                </div>
              </div>

              {campaignOutput ? (
                <OutputCard
                  isDark={isDark}
                  title="Campaign blueprint"
                  content={campaignOutput}
                  onCopy={() => void handleCopy(campaignOutput, 'Campaign blueprint disalin.')}
                  onDownload={() => downloadTextFile('campaign-blueprint.txt', campaignOutput)}
                  onApply={() => onApplyToComposer(campaignOutput)}
                  applyLabel="Pakai jadi caption awal"
                />
              ) : null}
            </div>
          )}

          {activeTab === 'copilot' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-xl font-bold">Copilot</h3>
                    <FieldHelp
                      title="Copilot"
                      description="Fitur ini adalah sparring partner cepat untuk bantu brainstorming, refine angle, dan mencari langkah kerja berikutnya."
                      howToUse="Tulis pertanyaan spesifik seperti hook yang mau dites atau angle terbaik untuk target tertentu, lalu klik Ask copilot dan pakai jawabannya sebagai bahan revisi."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pakai sebagai sparring partner untuk refine hook, angle, dan next-step produksi.</p>
                </div>
                <button type="button" onClick={() => void runCopilot()} disabled={loadingKey !== null} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                  {loadingKey === 'copilot' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Ask copilot
                </button>
              </div>
              <textarea value={copilotInput} onChange={(e) => setCopilotInput(e.target.value)} rows={6} placeholder="Tulis pertanyaan: misal angle mana yang paling keras untuk promo ini, atau hook apa yang sebaiknya dites dulu..." className={`${fieldClass} min-h-[150px] resize-y leading-6`} />
              {copilotOutput ? (
                <OutputCard
                  isDark={isDark}
                  title="Copilot response"
                  content={copilotOutput}
                  onCopy={() => void handleCopy(copilotOutput, 'Copilot response disalin.')}
                  onDownload={() => downloadTextFile('copilot-notes.txt', copilotOutput)}
                />
              ) : null}
            </div>
          )}

          {activeTab === 'provider' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-start gap-2">
                  <h3 className="text-xl font-bold">Pilot Config</h3>
                  <FieldHelp
                    title="Pilot Config"
                    description="Panel ini dipakai untuk memilih provider AI, memasukkan API key, model, dan endpoint override per browser seat."
                    howToUse="Pilih provider dulu, isi API key aktif kalau ada, tentukan model yang ingin dipakai, lalu simpan saja di browser ini. Setiap pilot bisa punya konfigurasi berbeda."
                  />
                </div>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Atur provider, API key, model, dan endpoint. Ini sengaja dipisah agar tiap pilot bisa punya setup sendiri.</p>
              </div>
              <div className={`grid gap-3 md:grid-cols-3 ${isDark ? '' : ''}`}>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-blue-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Current lane</p>
                  </div>
                  <p className="mt-3 text-base font-bold">{providerMeta.label}</p>
                  <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{providerMeta.badge}</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <KeyRound size={15} className="text-emerald-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">API status</p>
                  </div>
                  <p className="mt-3 text-base font-bold">{providerConfig.apiKey ? 'Key loaded' : 'Manual / demo'}</p>
                  <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{maskSecret(providerConfig.apiKey)}</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Globe2 size={15} className="text-purple-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Endpoint mode</p>
                  </div>
                  <p className="mt-3 text-base font-bold">{providerMeta.supportsBaseUrl ? 'Custom endpoint' : 'Managed default'}</p>
                  <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{providerConfig.baseUrl || providerMeta.baseUrl || 'Gunakan endpoint bawaan provider'}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PROVIDER_IDS.map((id) => {
                  const meta = PROVIDER_META[id];
                  const active = providerId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setProviderId(id)}
                      className={`rounded-[24px] p-4 text-left transition ${
                        active
                          ? isDark
                            ? 'bg-blue-500/15 ring-2 ring-blue-400/40'
                            : 'bg-blue-50 ring-2 ring-blue-200'
                          : isDark
                            ? 'bg-slate-900 ring-1 ring-white/10 hover:ring-white/20'
                            : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">{meta.label}</span>
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} />
                            Live slot
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-2 text-xs font-semibold ${active ? (isDark ? 'text-blue-200' : 'text-blue-700') : isDark ? 'text-slate-400' : 'text-slate-500'}`}>{meta.badge}</p>
                      <p className={`mt-2 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{meta.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                          Model: {providerConfigs[id].model || meta.defaultModel || 'manual'}
                        </span>
                        {meta.supportsBaseUrl ? (
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                            Endpoint custom
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={`rounded-[28px] p-5 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">Operator Console</p>
                      <FieldHelp
                        title="Operator Console"
                        description="Bagian ini adalah tempat isi detail teknis provider yang akan dipakai oleh lane studio saat generate output."
                        howToUse="Isi API key, model, dan kalau perlu base URL custom. Kalau hanya belajar atau demo, field bisa dibiarkan kosong dan sistem akan pakai fallback lokal."
                      />
                    </div>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Simpan slot provider, model utama, dan endpoint override khusus untuk pilot ini.</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                    {providerMeta.label}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <KeyRound size={14} className="text-emerald-500" />
                      API key
                    </span>
                    <input
                      type="password"
                      value={providerConfig.apiKey}
                      onChange={(e) => updateProviderConfig({ apiKey: e.target.value })}
                      placeholder={providerMeta.envKey ? `Bisa pakai env ${providerMeta.envKey} atau isi manual di sini` : 'Isi API key manual'}
                      className={fieldClass}
                    />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Kalau kosong, pilot bisa tetap pakai demo/local fallback. Untuk produksi, isi key aktif sesuai provider ini.</p>
                  </label>
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Cpu size={14} className="text-blue-500" />
                      Model
                    </span>
                    <input value={providerConfig.model} onChange={(e) => updateProviderConfig({ model: e.target.value })} placeholder={providerMeta.defaultModel} className={fieldClass} />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Masukkan slug model yang memang mau dipaksa dipakai oleh pilot lane ini.</p>
                  </label>
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Globe2 size={14} className="text-purple-500" />
                      Base URL
                    </span>
                    <input
                      value={providerConfig.baseUrl}
                      onChange={(e) => updateProviderConfig({ baseUrl: e.target.value })}
                      placeholder={providerMeta.baseUrl || 'Tidak perlu diubah'}
                      disabled={!providerMeta.supportsBaseUrl}
                      className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-55`}
                    />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{providerMeta.supportsBaseUrl ? 'Gunakan hanya kalau pilot memang butuh endpoint compatible/custom proxy.' : 'Provider ini memang tidak butuh override endpoint.'}</p>
                  </label>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={`rounded-[24px] p-4 text-sm leading-6 ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
                  <strong>Mode advanced:</strong> studio ini memang bukan autopilot ajaib. Ia cuma cockpit. Kalau prompt, style, dan model yang dipakai bagus, output ikut naik. Kalau setup pilot berantakan, hasilnya juga ikut biasa.
                </div>
                <div className={`rounded-[24px] p-4 text-sm leading-6 ${isDark ? 'bg-slate-950/80 text-slate-300 ring-1 ring-white/10' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-emerald-500" />
                    <strong>Ops note</strong>
                  </div>
                  <p className="mt-2">Slot provider disimpan lokal per browser seat. Jadi tiap pilot bisa punya taste, key, model, dan endpoint berbeda tanpa saling bentrok.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
