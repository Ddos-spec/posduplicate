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
  { id: 'provider', label: 'OpenRouter', helper: 'Model & API key', icon: Settings2 },
];

const VIDEO_PRESETS: Array<{
  id: string;
  label: string;
  detail: string;
  motion: (typeof VIDEO_MOTIONS)[number];
  duration: (typeof VIDEO_DURATIONS)[number];
  platform: string;
  starter: string;
}> = [
  {
    id: 'hook',
    label: 'Hook Cepat',
    detail: '3-15 detik untuk scroll stopper',
    motion: 'Crash zoom',
    duration: '15 detik',
    platform: 'Instagram Reels',
    starter: 'Buka dengan hook paling nyentak di 3 detik pertama, tampilkan problem utama, lalu arahkan ke CTA singkat.',
  },
  {
    id: 'ugc',
    label: 'UGC Natural',
    detail: 'Testimoni / edukasi santai',
    motion: 'Handheld UGC',
    duration: '30 detik',
    platform: 'TikTok',
    starter: 'Bikin video terasa natural seperti creator asli, fokus ke masalah user lalu kasih solusi sederhana yang believable.',
  },
  {
    id: 'premium',
    label: 'Promo Premium',
    detail: 'Visual rapi untuk ads produk/jasa',
    motion: 'Reveal cinematic',
    duration: '30 detik',
    platform: 'YouTube Shorts',
    starter: 'Tampilkan visual premium, transisi halus, sorot benefit utama, dan tutup dengan CTA visual yang elegan.',
  },
];

const IMAGE_PRESETS: Array<{
  id: string;
  label: string;
  detail: string;
  style: (typeof ART_STYLES)[number];
  ratio: AspectRatio;
  starter: string;
}> = [
  {
    id: 'hero',
    label: 'Hero Produk',
    detail: 'Visual utama untuk ads / landing',
    style: 'Luxury Product',
    ratio: '16:9',
    starter: 'Hero visual produk utama, rapi, clean, fokus ke produk dan value paling mahal.',
  },
  {
    id: 'social',
    label: 'Konten Sosial',
    detail: 'Feed / thumbnail / promosi ringan',
    style: 'Editorial',
    ratio: '1:1',
    starter: 'Visual promosi sosial media yang clean, menarik, dan gampang dibaca dalam sekali lihat.',
  },
  {
    id: 'catalog',
    label: 'Katalog Premium',
    detail: 'Untuk katalog dan listing',
    style: 'Photorealistic',
    ratio: '4:3',
    starter: 'Foto katalog yang terang, rapi, fokus ke detail produk, dan siap dipakai listing atau brosur.',
  },
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
  const [providerId] = useState<ProviderId>('openrouter');
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
  const [imagePresetId, setImagePresetId] = useState<string>('hero');
  const [showImageAdvanced, setShowImageAdvanced] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [videoPresetId, setVideoPresetId] = useState<string>('hook');
  const [showVideoAdvanced, setShowVideoAdvanced] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showProviderConsole, setShowProviderConsole] = useState(false);
  const [showHelperTabs, setShowHelperTabs] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true);

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

  useEffect(() => {
    if (imagePrompt.trim()) return;
    applyImagePreset(imagePresetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoIdea.trim()) return;
    applyVideoPreset(videoPresetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providerMeta = PROVIDER_META[providerId];
  const providerConfig = providerConfigs[providerId];
  const mainTabs = tabs.filter((tab) => tab.id === 'image' || tab.id === 'video');
  const helperTabs = tabs.filter((tab) => tab.id === 'copy' || tab.id === 'campaign' || tab.id === 'copilot');
  const activeMainLane = activeTab === 'video' ? 'video' : 'image';
  const hasOpenRouterKey = Boolean((providerConfig.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || '').trim());
  const imagePreview = useMemo(
    () => buildPreviewSvg(imagePrompt || 'Visual direction', `${artStyle} · ${aspectRatio}`, 'Image Brief', `${imagePrompt}-${artStyle}-${aspectRatio}`),
    [imagePrompt, artStyle, aspectRatio],
  );
  const videoPreview = useMemo(
    () => buildPreviewSvg(videoIdea || 'Motion storyboard', `${videoPlatform} · ${videoMotion}`, 'Video Board', `${videoIdea}-${videoPlatform}-${videoMotion}`),
    [videoIdea, videoPlatform, videoMotion],
  );
  const updateProviderConfig = (patch: Partial<ProviderConfigMap[ProviderId]>) => {
    setProviderConfigs((current) => ({
      ...current,
      openrouter: {
        ...current.openrouter,
        ...patch,
      },
    }));
  };

  const applyVideoPreset = (presetId: string) => {
    const preset = VIDEO_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setVideoPresetId(preset.id);
    setVideoMotion(preset.motion);
    setVideoDuration(preset.duration);
    setVideoPlatform(preset.platform);
    setVideoIdea((current) => current.trim() ? current : preset.starter);
  };

  const applyImagePreset = (presetId: string) => {
    const preset = IMAGE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setImagePresetId(preset.id);
    setArtStyle(preset.style);
    setAspectRatio(preset.ratio);
    setImagePrompt((current) => current.trim() ? current : preset.starter);
  };

  const runCopy = async () => {
    if (!copyPrompt.trim()) {
      toast.error('Isi brief dulu untuk Copy Lab.');
      return;
    }
    setLoadingKey('copy');
    try {
      const result = !hasOpenRouterKey
        ? createCopyFallback(copyType, copyTone, copyPrompt)
        : await requestProviderText({
            providerId: 'openrouter',
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
      const result = !hasOpenRouterKey
        ? createImageFallback(imagePrompt, 'Studio Visual', artStyle, aspectRatio, negativePrompt)
        : await requestProviderText({
            providerId: 'openrouter',
            config: {
              ...providerConfig,
              model: (providerConfig.imageModel || providerConfig.model || '').trim(),
            },
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
      const result = !hasOpenRouterKey
        ? createVideoFallback(videoIdea, videoMotion, videoDuration, videoPlatform)
        : await requestProviderText({
            providerId: 'openrouter',
            config: {
              ...providerConfig,
              model: (providerConfig.videoModel || providerConfig.model || '').trim(),
            },
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
      const result = !hasOpenRouterKey
        ? createCampaignFallback(campaignProduct, campaignOffer, campaignAudience, campaignGoal)
        : await requestProviderText({
            providerId: 'openrouter',
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
      const result = !hasOpenRouterKey
        ? createChatFallback(copilotInput)
        : await requestProviderText({
            providerId: 'openrouter',
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
    <div className="space-y-3">
      <div className={`rounded-[24px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border border-slate-100 shadow-sm'}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-200">
              <Sparkles size={14} />
              Content Studio
            </div>
            <div className="flex items-start gap-2">
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Studio kerja</h2>
              <FieldHelp
                title="Content Studio"
                description="Ini cockpit utama untuk bikin caption, visual brief, storyboard video, dan blueprint campaign tanpa bikin user kebanyakan setting."
                howToUse="Pilih mode kerja dari tombol di bawah, isi ide utama, lalu generate. Kalau perlu kontrol lebih detail, baru buka pengaturan lanjutan."
              />
            </div>
            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Fokus ke ide utama dan generate cepat. Tool tambahan tetap ada, tapi disembunyikan dulu supaya cockpit terasa ringan.
            </p>
            <div className="flex flex-wrap gap-3">
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeMainLane === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex min-w-[180px] items-center gap-3 rounded-[20px] px-4 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? isDark
                          ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : isDark
                          ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10 hover:bg-slate-800'
                          : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="space-y-0.5">
                      <span className="block">{tab.label}</span>
                      <span className={`block text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tab.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2 xl:min-w-[260px] xl:max-w-[300px]">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimpleMode(true)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  simpleMode
                    ? isDark ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                Mode simpel
              </button>
              <button
                type="button"
                onClick={() => setSimpleMode(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  !simpleMode
                    ? isDark ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                Mode lengkap
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowHelperTabs((current) => !current)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${isDark ? 'bg-slate-900 text-slate-200 ring-1 ring-white/10 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-white'}`}
              >
                {showHelperTabs ? 'Tutup tool bantu' : 'Tool bantu'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('provider');
                  setShowProviderConsole(true);
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${isDark ? 'bg-slate-900 text-slate-200 ring-1 ring-white/10 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-white'}`}
              >
                Atur OpenRouter
              </button>
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-slate-900 ring-1 ring-white/10 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
              <span className="block text-[10px] uppercase tracking-[0.18em] opacity-60">Status</span>
              <span className="font-bold">{hasOpenRouterKey ? 'Live key siap' : 'Fallback aman'}</span>
            </div>
          </div>
        </div>

        {showHelperTabs || !simpleMode ? (
          <div className="mt-5 flex flex-wrap gap-2">
          {helperTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? isDark
                      ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30'
                      : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : isDark
                      ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10 hover:bg-slate-800'
                      : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
          </div>
        ) : null}

        <div className={`mt-3 rounded-2xl px-4 py-3 text-xs leading-6 ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
          <strong>Tip cepat:</strong> mulai dari Photo atau Video dulu. Copy, Campaign, Copilot, dan console OpenRouter cukup dibuka saat memang dibutuhkan.
        </div>
      </div>

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
                      howToUse="Pilih preset visual dulu, isi ide utama, lalu generate. Kalau perlu rasio, style, atau negative prompt yang lebih spesifik, baru buka pengaturan lanjutan."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Visual lane juga saya bikin cepat: pilih preset, isi ide utama, lalu generate brief tanpa terlalu banyak atur-atur di depan.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageAdvanced((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                      isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Settings2 size={16} />
                    {showImageAdvanced ? 'Sembunyikan detail' : 'Atur detail'}
                  </button>
                  <button type="button" onClick={() => void runImageBrief()} disabled={loadingKey !== null} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                    {loadingKey === 'image' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Generate visual brief
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {IMAGE_PRESETS.map((preset) => {
                      const active = imagePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyImagePreset(preset.id)}
                          className={`rounded-[22px] border p-4 text-left transition ${
                            active
                              ? isDark
                                ? 'border-blue-400/40 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                                : 'border-blue-200 bg-blue-50 shadow-sm'
                              : isDark
                                ? 'border-white/10 bg-slate-900/70 hover:border-blue-400/20'
                                : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold">{preset.label}</p>
                            {active ? <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Default</span> : null}
                          </div>
                          <p className={`mt-2 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{preset.detail}</p>
                        </button>
                      );
                    })}
                  </div>

                  <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={5} placeholder="Contoh: sedan hitam premium di jalan basah malam hari, city glow, cocok untuk hero rental mobil..." className={`${fieldClass} min-h-[132px] resize-y leading-6`} />

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>{artStyle}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{aspectRatio}</span>
                    <button
                      type="button"
                      onClick={() => setShowImagePreview((current) => !current)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {showImagePreview ? 'Sembunyikan preview' : 'Lihat preview'}
                    </button>
                  </div>

                  {showImageAdvanced ? (
                    <div className={`space-y-4 rounded-[24px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">Fine tune visual</p>
                        <FieldHelp
                          title="Pengaturan lanjutan visual"
                          description="Bagian ini hanya untuk pilot yang ingin mengatur style, ratio, dan negative prompt lebih spesifik."
                          howToUse="Kalau hasil default sudah cukup, jangan dibuka. Pakai hanya saat butuh eksplorasi visual yang lebih detail."
                        />
                      </div>
                      <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={3} placeholder="Negative prompt" className={`${fieldClass} min-h-[92px] resize-y leading-6`} />
                      <div className="flex flex-wrap gap-2">
                        {ART_STYLES.map((item) => <ChoicePill key={item} active={artStyle === item} label={item} onClick={() => setArtStyle(item)} isDark={isDark} />)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ASPECT_RATIOS.map((item) => <ChoicePill key={item} active={aspectRatio === item} label={item} onClick={() => setAspectRatio(item)} isDark={isDark} />)}
                      </div>
                    </div>
                  ) : null}
                  {showImagePreview ? (
                    <div className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                      <img src={imagePreview} alt="Visual preview" className="w-full rounded-[24px] object-cover shadow-sm" />
                      <p className={`mt-3 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Preview ini hanya mood board visual. Output utama tetap berupa brief yang nanti dieksekusi pilot / designer / generator.
                      </p>
                    </div>
                  ) : null}
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
              <div className={`overflow-hidden rounded-[32px] border p-6 md:p-8 ${
                isDark
                  ? 'border-fuchsia-500/20 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.28),_transparent_42%),linear-gradient(180deg,rgba(73,11,44,0.96),rgba(28,7,26,0.98))]'
                  : 'border-fuchsia-100 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.32),_transparent_40%),linear-gradient(180deg,#fff1f7,#fff9fc)]'
              }`}>
                <div className="mx-auto max-w-5xl space-y-6">
                  <div className="text-center">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${isDark ? 'text-fuchsia-200/80' : 'text-fuchsia-500'}`}>Marketing Studio</p>
                    <div className="mt-3 flex items-start justify-center gap-2">
                      <h3 className={`max-w-3xl text-3xl font-black uppercase tracking-tight md:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Turn any product into a video ad
                      </h3>
                      <FieldHelp
                        title="Video Marketing Studio"
                        description="Lane ini dibuat seperti studio prompt cepat: fokus ke brief inti, preset style, lalu generate storyboard tanpa bikin user tenggelam di setting."
                        howToUse="Pilih preset yang paling dekat, isi brief produk atau ide utama, lalu generate. Kalau perlu kontrol lebih detail, baru buka pengaturan lanjutan di bawah."
                      />
                    </div>
                    <p className={`mx-auto mt-3 max-w-2xl text-sm leading-6 ${isDark ? 'text-fuchsia-100/75' : 'text-slate-600'}`}>
                      Fokus ke brief utama, hook, tone, dan CTA. Setting berat disembunyikan supaya pilot bisa langsung kerja tanpa ribet.
                    </p>
                  </div>

                  <div className={`rounded-[28px] border p-4 md:p-5 ${
                    isDark
                      ? 'border-white/10 bg-black/20 backdrop-blur'
                      : 'border-white/70 bg-white/80 shadow-sm backdrop-blur'
                  }`}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="space-y-4">
                        <textarea
                          value={videoIdea}
                          onChange={(e) => setVideoIdea(e.target.value)}
                          rows={4}
                          placeholder="Contoh: buat video UGC casual bahasa Indonesia untuk produk AI glasses. Hook: kerja hands-free, terjemahan real-time, desain tetap seperti kacamata biasa. Tutup dengan CTA halus."
                          className={`${fieldClass} min-h-[136px] resize-y border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0 ${isDark ? 'text-white placeholder:text-fuchsia-100/35' : 'text-slate-900 placeholder:text-slate-400'}`}
                        />
                        <div className="flex flex-wrap gap-2">
                          {VIDEO_PRESETS.map((preset) => {
                            const active = videoPresetId === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyVideoPreset(preset.id)}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                  active
                                    ? isDark
                                      ? 'bg-fuchsia-500/20 text-white ring-1 ring-fuchsia-300/40'
                                      : 'bg-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200'
                                    : isDark
                                      ? 'bg-white/5 text-fuchsia-100/85 hover:bg-white/10'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setShowVideoAdvanced((current) => !current)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              isDark ? 'bg-white/5 text-fuchsia-100/85 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {showVideoAdvanced ? 'Sembunyikan detail' : 'Atur detail'}
                          </button>
                        </div>
                      </div>

                      <div className="flex min-w-[220px] flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`rounded-[22px] border p-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Preset</p>
                            <p className="mt-2 text-sm font-bold">{VIDEO_PRESETS.find((preset) => preset.id === videoPresetId)?.label ?? 'Default'}</p>
                            <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Siap pakai</p>
                          </div>
                          <div className={`rounded-[22px] border p-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Output</p>
                            <p className="mt-2 text-sm font-bold">Storyboard</p>
                            <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hook + CTA</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void runVideoBoard()}
                          disabled={loadingKey !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-fuchsia-500 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-fuchsia-500/30 transition hover:bg-fuchsia-600 disabled:opacity-60"
                        >
                          {loadingKey === 'video' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          Generate storyboard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>{videoPlatform}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{videoDuration}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{videoMotion}</span>
                    <button
                      type="button"
                      onClick={() => setShowVideoPreview((current) => !current)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                    >
                      {showVideoPreview ? 'Sembunyikan preview' : 'Lihat preview'}
                    </button>
                  </div>
                    <p className={`mt-3 text-xs leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Default ini sengaja dibikin aman dulu. Kalau user tidak mau ribet, cukup isi ide utama di bawah lalu generate. Pengaturan lanjutan hanya dipakai kalau benar-benar perlu.
                    </p>
                  </div>

                  {showVideoAdvanced ? (
                    <div className={`space-y-4 rounded-[24px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">Atur Detail Video</p>
                        <FieldHelp
                          title="Pengaturan lanjutan video"
                          description="Bagian ini hanya untuk pilot yang mau override default preset seperti motion, durasi, atau platform target."
                          howToUse="Kalau hasil default sudah cukup, abaikan bagian ini. Pakai hanya saat butuh eksperimen khusus atau style video yang lebih presisi."
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_MOTIONS.map((item) => <ChoicePill key={item} active={videoMotion === item} label={item} onClick={() => setVideoMotion(item)} isDark={isDark} />)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_DURATIONS.map((item) => <ChoicePill key={item} active={videoDuration === item} label={item} onClick={() => setVideoDuration(item)} isDark={isDark} />)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook Reels'].map((platform) => (
                          <ChoicePill key={platform} active={videoPlatform === platform} label={platform} onClick={() => setVideoPlatform(platform)} isDark={isDark} />
                        ))}
                      </div>
                      <input value={videoPlatform} onChange={(e) => setVideoPlatform(e.target.value)} placeholder="Platform target, misal Instagram Reels / TikTok / YouTube Shorts" className={fieldClass} />
                    </div>
                  ) : null}
                  {showVideoPreview ? (
                    <div className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                      <img src={videoPreview} alt="Video preview" className="w-full rounded-[24px] object-cover shadow-sm" />
                      <p className={`mt-3 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Ini preview mood board motion. Output utamanya tetap storyboard teks agar pilot tinggal eksekusi di tool video mana pun tanpa ribet setup.
                      </p>
                    </div>
                  ) : null}
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
                  <h3 className="text-xl font-bold">OpenRouter Console</h3>
                  <FieldHelp
                    title="OpenRouter Console"
                    description="Panel ini sekarang dipusatkan ke OpenRouter saja supaya pilot tidak bingung milih terlalu banyak provider."
                    howToUse="Kalau ada API key OpenRouter, isi di sini lalu pilih model. Kalau belum ada, biarkan kosong dan studio tetap pakai fallback default untuk belajar workflow."
                  />
                </div>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sengaja dibuat satu jalur saja: OpenRouter. Lebih simpel, lebih modern, dan user tidak perlu pusing milih terlalu banyak engine.</p>
              </div>
              <div className={`grid gap-3 md:grid-cols-3 ${isDark ? '' : ''}`}>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-blue-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Current lane</p>
                  </div>
                  <p className="mt-3 text-base font-bold">{providerMeta.label}</p>
                  <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Semua tool studio sekarang dirouting ke OpenRouter.</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <KeyRound size={15} className="text-emerald-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">API status</p>
                  </div>
                  <p className="mt-3 text-base font-bold">{providerConfig.apiKey ? 'Key loaded' : 'Manual / demo'}</p>
                  <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{maskSecret(providerConfig.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || '')}</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Globe2 size={15} className="text-purple-500" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Endpoint mode</p>
                  </div>
                  <p className="mt-3 text-base font-bold">Managed default</p>
                  <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{providerMeta.baseUrl}</p>
                </div>
              </div>

              <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">Slot default OpenRouter</p>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cukup satu jalur, tinggal pilih model yang cocok. Selebihnya biarkan setting default supaya user tidak pusing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProviderConsole((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                      isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Settings2 size={16} />
                    {showProviderConsole ? 'Tutup console' : 'Buka console'}
                  </button>
                </div>
              </div>

              {showProviderConsole ? (
              <div className={`rounded-[28px] p-5 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">Operator Console</p>
                      <FieldHelp
                        title="Operator Console"
                        description="Bagian ini adalah tempat isi detail OpenRouter yang akan dipakai oleh lane studio saat generate output."
                        howToUse="Isi API key OpenRouter dan model utama. Kalau tidak diisi, studio akan tetap hidup memakai fallback lokal supaya pilot tidak berhenti kerja."
                      />
                    </div>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Isi key OpenRouter sekali, lalu bedakan model untuk kerja umum, foto, dan video supaya output tiap lane lebih pas.</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                    OpenRouter only
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
                      Model umum
                    </span>
                    <input value={providerConfig.model} onChange={(e) => updateProviderConfig({ model: e.target.value })} placeholder={providerMeta.defaultModel} className={fieldClass} />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Dipakai untuk copy, campaign, dan copilot.</p>
                  </label>
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <ImageIcon size={14} className="text-cyan-500" />
                      Model foto
                    </span>
                    <input
                      value={providerConfig.imageModel || ''}
                      onChange={(e) => updateProviderConfig({ imageModel: e.target.value })}
                      placeholder="google/gemini-2.5-flash-image-preview"
                      className={fieldClass}
                    />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Khusus untuk Visual Brief / lane foto.</p>
                  </label>
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <PlaySquare size={14} className="text-fuchsia-500" />
                      Model video
                    </span>
                    <input
                      value={providerConfig.videoModel || ''}
                      onChange={(e) => updateProviderConfig({ videoModel: e.target.value })}
                      placeholder="google/gemini-2.5-flash"
                      className={fieldClass}
                    />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Khusus untuk Motion Board / lane video.</p>
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
                      disabled
                      className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-55`}
                    />
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tidak perlu diubah. Studio ini sengaja dikunci ke endpoint default OpenRouter.</p>
                  </label>
                </div>
              </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={`rounded-[24px] p-4 text-sm leading-6 ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
                  <strong>Mode advanced:</strong> walau jalurnya sekarang disederhanakan ke OpenRouter, hasil tetap bergantung pada prompt, taste, dan eksekusi pilot. Jadi cockpit ini sengaja dibuat simpel, bukan serba otomatis.
                </div>
                <div className={`rounded-[24px] p-4 text-sm leading-6 ${isDark ? 'bg-slate-950/80 text-slate-300 ring-1 ring-white/10' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-emerald-500" />
                    <strong>Ops note</strong>
                  </div>
                  <p className="mt-2">Key dan model OpenRouter tetap disimpan lokal per browser seat. Jadi tiap pilot masih bisa punya rasa kerja sendiri tanpa membebani user awam dengan terlalu banyak pilihan provider.</p>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
