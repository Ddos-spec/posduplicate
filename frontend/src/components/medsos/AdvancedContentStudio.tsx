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
import {
  generateOpenRouterImage,
  generateOpenRouterVideo,
  getOpenRouterImageModels,
  getOpenRouterVideoModels,
  getOpenRouterVideoStatus,
  type ContentStudioModelOption,
  type GenerateVideoResponse,
} from '../../services/medsosContentStudioService';

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

const FALLBACK_IMAGE_MODELS: ContentStudioModelOption[] = [
  { id: 'google/gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image Preview', outputModalities: ['image', 'text'] },
];

const FALLBACK_VIDEO_MODELS: ContentStudioModelOption[] = [
  { id: 'google/veo-3.1', name: 'Veo 3.1', supportedAspectRatios: ['16:9'], supportedDurations: [5, 8], supportedResolutions: ['720p'] },
];

function getModelLabel(model: ContentStudioModelOption) {
  return model.name && model.name !== model.id ? `${model.name} — ${model.id}` : model.id;
}

function getOpenRouterKey(config: ProviderConfigMap[ProviderId]) {
  return (config.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
}

function videoAspectFromPlatform(platform: string) {
  const normalized = platform.toLowerCase();
  if (normalized.includes('tiktok') || normalized.includes('reels') || normalized.includes('short')) return '9:16';
  return '16:9';
}

function buildVideoPrompt(input: {
  idea: string;
  platform: string;
  motion: string;
  duration: string;
  mediaLabel?: string;
}) {
  return [
    input.idea,
    `Target platform: ${input.platform}`,
    `Camera / motion direction: ${input.motion}`,
    `Creative duration intent: ${input.duration}`,
    input.mediaLabel ? `Use the uploaded reference media as product/style context: ${input.mediaLabel}` : '',
    'Create a polished short-form marketing video. Keep it natural, commercial-ready, and visually clear.',
  ].filter(Boolean).join('\n');
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
  mediaPreview,
  mediaLabel,
  onPickMedia,
  onOpenCamera,
  canUseCamera = false,
}: {
  isDark: boolean;
  onApplyToComposer: (text: string) => void;
  preferredTab?: StudioTab;
  mediaPreview?: string | null;
  mediaLabel?: string;
  onPickMedia?: () => void;
  onOpenCamera?: () => void;
  canUseCamera?: boolean;
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
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [videoPresetId, setVideoPresetId] = useState<string>('hook');
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showProviderConsole, setShowProviderConsole] = useState(false);
  const [showStudioSettings, setShowStudioSettings] = useState(false);
  const [imageModelOptions, setImageModelOptions] = useState<ContentStudioModelOption[]>(FALLBACK_IMAGE_MODELS);
  const [videoModelOptions, setVideoModelOptions] = useState<ContentStudioModelOption[]>(FALLBACK_VIDEO_MODELS);
  const [modelSourceNote, setModelSourceNote] = useState('Model akan dibaca dari OpenRouter setelah API key siap.');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [videoJob, setVideoJob] = useState<GenerateVideoResponse['job'] | null>(null);

  const [loadingKey, setLoadingKey] = useState<null | 'copy' | 'image' | 'video' | 'campaign' | 'copilot' | 'models' | 'video-status'>(null);
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
  const activeMainLane = activeTab === 'video' ? 'video' : 'image';
  const openRouterKey = getOpenRouterKey(providerConfig);
  const hasOpenRouterKey = Boolean(openRouterKey);
  const isVideoLane = activeMainLane === 'video';
  const currentPresetLabel = isVideoLane
    ? VIDEO_PRESETS.find((preset) => preset.id === videoPresetId)?.label ?? 'Default'
    : IMAGE_PRESETS.find((preset) => preset.id === imagePresetId)?.label ?? 'Default';
  const availableModels = isVideoLane ? videoModelOptions : imageModelOptions;
  const selectedModel = isVideoLane
    ? (providerConfig.videoModel || videoModelOptions[0]?.id || providerConfig.model)
    : (providerConfig.imageModel || imageModelOptions[0]?.id || providerConfig.model);
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

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoadingKey((current) => (current ? current : 'models'));
        const [imageResult, videoResult] = await Promise.allSettled([
          getOpenRouterImageModels(openRouterKey || undefined),
          openRouterKey ? getOpenRouterVideoModels(openRouterKey) : Promise.resolve({ models: FALLBACK_VIDEO_MODELS, source: 'fallback' as const, warning: 'Isi API key OpenRouter untuk membaca semua model video yang tersedia.' }),
        ]);

        if (cancelled) return;

        const nextImageModels = imageResult.status === 'fulfilled' && imageResult.value.models.length
          ? imageResult.value.models
          : FALLBACK_IMAGE_MODELS;
        const nextVideoModels = videoResult.status === 'fulfilled' && videoResult.value.models.length
          ? videoResult.value.models
          : FALLBACK_VIDEO_MODELS;

        setImageModelOptions(nextImageModels);
        setVideoModelOptions(nextVideoModels);

        const imageSource = imageResult.status === 'fulfilled' ? imageResult.value.source : 'fallback';
        const videoSource = videoResult.status === 'fulfilled' ? videoResult.value.source : 'fallback';
        setModelSourceNote(
          imageSource === 'openrouter' || videoSource === 'openrouter'
            ? 'Daftar model dibaca langsung dari OpenRouter. Model video hanya muncul lengkap kalau API key valid.'
            : 'Memakai fallback model. Isi API key OpenRouter agar daftar video lengkap terbaca.',
        );

        setProviderConfigs((current) => {
          const currentImageModel = current.openrouter.imageModel || '';
          const currentVideoModel = current.openrouter.videoModel || '';
          const imageValid = nextImageModels.some((model) => model.id === currentImageModel);
          const videoValid = nextVideoModels.some((model) => model.id === currentVideoModel);
          return {
            ...current,
            openrouter: {
              ...current.openrouter,
              imageModel: imageValid ? currentImageModel : nextImageModels[0]?.id || current.openrouter.imageModel,
              videoModel: videoValid ? currentVideoModel : nextVideoModels[0]?.id || current.openrouter.videoModel,
            },
          };
        });
      } catch (error: any) {
        if (!cancelled) {
          setModelSourceNote(error?.message || 'Gagal membaca model OpenRouter. Fallback tetap tersedia.');
        }
      } finally {
        if (!cancelled) setLoadingKey((current) => (current === 'models' ? null : current));
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [openRouterKey]);

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
      toast.error('Isi prompt foto dulu.');
      return;
    }
    setLoadingKey('image');
    setGeneratedImageUrl('');
    try {
      if (!hasOpenRouterKey) {
        const result = createImageFallback(imagePrompt, 'Studio Visual', artStyle, aspectRatio, negativePrompt);
        setImageOutput(result);
        setActiveTab('image');
        toast('Fallback aktif. Isi API key OpenRouter untuk generate gambar asli.');
        return;
      }

      const result = await generateOpenRouterImage({
        apiKey: openRouterKey,
        model: (providerConfig.imageModel || providerConfig.model || imageModelOptions[0]?.id || '').trim(),
        prompt: `${imagePrompt}\nStyle: ${artStyle}\nOutput harus berupa gambar final, bukan hanya deskripsi.`,
        aspectRatio,
        negativePrompt,
        referenceImage: mediaPreview || null,
      });
      const imageUrl = result.imageUrls[0] || '';
      setGeneratedImageUrl(imageUrl);
      setImageOutput(result.text || `Gambar berhasil dibuat dengan model ${result.model}.`);
      setShowImagePreview(true);
      setActiveTab('image');
      toast.success('Gambar berhasil digenerate.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Gagal generate foto.');
    } finally {
      setLoadingKey(null);
    }
  };

  const refreshVideoJobStatus = async (jobId = videoJob?.id) => {
    if (!jobId) return;
    if (!hasOpenRouterKey) {
      toast.error('API key OpenRouter belum diisi.');
      return;
    }
    setLoadingKey('video-status');
    try {
      const status = await getOpenRouterVideoStatus(openRouterKey, jobId);
      setVideoJob(status);
      const videoUrl = status.unsigned_urls?.[0] || '';
      if (videoUrl) {
        setGeneratedVideoUrl(videoUrl);
        setShowVideoPreview(true);
      }
      setVideoOutput([
        `Status video: ${status.status}`,
        `Job ID: ${status.id}`,
        status.generation_id ? `Generation ID: ${status.generation_id}` : '',
        videoUrl ? `Video URL: ${videoUrl}` : 'Video belum selesai. Klik refresh status beberapa saat lagi.',
        status.error ? `Error: ${status.error}` : '',
      ].filter(Boolean).join('\n'));
      if (status.status === 'completed') toast.success('Video sudah selesai.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Gagal cek status video.');
    } finally {
      setLoadingKey(null);
    }
  };

  const runVideoBoard = async () => {
    if (!videoIdea.trim()) {
      toast.error('Isi prompt video dulu.');
      return;
    }
    setLoadingKey('video');
    setGeneratedVideoUrl('');
    setVideoJob(null);
    try {
      if (!hasOpenRouterKey) {
        const result = createVideoFallback(videoIdea, videoMotion, videoDuration, videoPlatform);
        setVideoOutput(result);
        setActiveTab('video');
        toast('Fallback aktif. Isi API key OpenRouter untuk submit video asli.');
        return;
      }

      const result = await generateOpenRouterVideo({
        apiKey: openRouterKey,
        model: (providerConfig.videoModel || videoModelOptions[0]?.id || '').trim(),
        prompt: buildVideoPrompt({ idea: videoIdea, platform: videoPlatform, motion: videoMotion, duration: videoDuration, mediaLabel }),
        aspectRatio: videoAspectFromPlatform(videoPlatform),
        duration: videoDuration,
        resolution: '720p',
        generateAudio: true,
      });
      setVideoJob(result.job);
      const videoUrl = result.job.unsigned_urls?.[0] || '';
      if (videoUrl) setGeneratedVideoUrl(videoUrl);
      setVideoOutput([
        `Video job berhasil dikirim ke OpenRouter.`,
        `Model: ${result.model}`,
        `Status: ${result.job.status}`,
        `Job ID: ${result.job.id}`,
        result.job.polling_url ? `Polling: ${result.job.polling_url}` : '',
        videoUrl ? `Video URL: ${videoUrl}` : 'Video generation async. Tunggu lalu klik Refresh status.',
      ].filter(Boolean).join('\n'));
      setShowVideoPreview(true);
      setActiveTab('video');
      toast.success('Job video dikirim. Tunggu proses OpenRouter selesai.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Gagal submit video.');
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
        <div className="relative overflow-hidden rounded-[20px]">
          <div className={`pointer-events-none absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_35%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.10),transparent_35%)]'}`} />
          <div className="relative space-y-4">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-200">
              <Sparkles size={14} />
              Content Studio
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-start gap-2">
                  <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Generator konten</h2>
                  <FieldHelp
                    title="Content Studio"
                    description="Ini cockpit utama untuk bikin caption, visual brief, storyboard video, dan output final tanpa bikin user kebanyakan setting."
                    howToUse="Pilih mode foto atau video, pasang media kalau ada, isi prompt utama, pilih model, lalu generate. Detail lanjutan cukup dibuka kalau memang perlu."
                  />
                </div>
                <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fokus ke 4 hal saja: mode, media, prompt, dan model. Yang advance saya sembunyikan ke pop-up settings.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {mainTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeMainLane === tab.id;
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
                      {tab.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowStudioSettings(true)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${isDark ? 'bg-slate-900 text-slate-200 ring-1 ring-white/10 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-white'}`}
                >
                  <Settings2 size={16} />
                  Settings
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
              <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Media referensi</p>
                    <p className="text-sm font-semibold">{mediaLabel || (mediaPreview ? 'Media siap' : 'Tambahkan gambar / video')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onPickMedia}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <ImageIcon size={14} />
                    {mediaPreview ? 'Ganti' : 'Pilih media'}
                  </button>
                </div>
                <div className={`overflow-hidden rounded-[20px] border ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="Media reference" className="h-44 w-full object-cover" />
                  ) : (
                    <div className={`flex h-44 flex-col items-center justify-center gap-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <ImageIcon size={34} />
                      <p className="text-xs">Masukkan media supaya pilot tinggal fokus ke prompt.</p>
                    </div>
                  )}
                </div>
                {canUseCamera && onOpenCamera ? (
                  <button
                    type="button"
                    onClick={onOpenCamera}
                    className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <ImageIcon size={14} />
                    Buka kamera
                  </button>
                ) : null}
              </div>

              <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(isVideoLane ? VIDEO_PRESETS : IMAGE_PRESETS).map((preset) => {
                      const active = isVideoLane ? videoPresetId === preset.id : imagePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => isVideoLane ? applyVideoPreset(preset.id) : applyImagePreset(preset.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? isDark ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/30' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}>
                    {currentPresetLabel}
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <label className="space-y-1">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Model</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => isVideoLane
                        ? updateProviderConfig({ videoModel: e.target.value })
                        : updateProviderConfig({ imageModel: e.target.value })}
                      className={`${fieldClass} min-w-[240px] py-2.5`}
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>{getModelLabel(model)}</option>
                      ))}
                    </select>
                  </label>
                  <div className={`rounded-2xl px-3 py-2 text-xs ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    {loadingKey === 'models' ? 'Membaca model...' : hasOpenRouterKey ? 'OpenRouter aktif' : 'Fallback aktif'}
                  </div>
                </div>
                <p className={`mb-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{modelSourceNote}</p>

                <textarea
                  value={isVideoLane ? videoIdea : imagePrompt}
                  onChange={(e) => isVideoLane ? setVideoIdea(e.target.value) : setImagePrompt(e.target.value)}
                  rows={6}
                  placeholder={isVideoLane
                    ? 'Tulis ide video, hook utama, tone, CTA, atau jalannya video di sini...'
                    : 'Tulis ide foto, visual utama, suasana, angle, dan hasil akhir yang diinginkan di sini...'}
                  className={`${fieldClass} min-h-[180px] resize-y leading-6`}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isVideoLane
                      ? 'Video: isi brief, pilih model, lalu generate storyboard.'
                      : 'Foto: isi visual intent, pilih model, lalu generate brief.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => isVideoLane ? void runVideoBoard() : void runImageBrief()}
                    disabled={loadingKey !== null}
                    className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60"
                  >
                    {loadingKey === (isVideoLane ? 'video' : 'image') ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isVideoLane ? 'Generate video' : 'Generate foto'}
                  </button>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl px-4 py-3 text-xs leading-6 ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
              <strong>Tip cepat:</strong> mulai dari satu media, satu prompt, dan satu model dulu. Detail lanjutan cukup dibuka kalau output awal belum pas.
            </div>
          </div>
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-lg font-bold">Hasil foto</h3>
                    <FieldHelp
                      title="Hasil foto"
                      description="Bagian ini menampilkan brief dan preview visual setelah prompt diproses."
                      howToUse="Kalau hasilnya belum pas, ubah prompt utama atau buka settings. Kalau sudah pas, copy hasilnya atau pakai ke proses publish berikutnya."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Preview dan brief akhir ditampilkan di sini.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImagePreview((current) => !current)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {showImagePreview ? 'Sembunyikan preview' : 'Lihat preview'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>{artStyle}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{aspectRatio}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{currentPresetLabel}</span>
              </div>

              {showImagePreview ? (
                <div className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  <img src={generatedImageUrl || imagePreview} alt="Visual preview" className="w-full rounded-[24px] object-cover shadow-sm" />
                  <p className={`mt-3 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {generatedImageUrl ? 'Ini hasil gambar asli dari OpenRouter.' : 'Preview ini hanya mood board visual. Generate dengan API key OpenRouter untuk menghasilkan gambar asli.'}
                  </p>
                </div>
              ) : null}

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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-lg font-bold">Hasil video</h3>
                    <FieldHelp
                      title="Hasil video"
                      description="Bagian ini menampilkan storyboard, preview motion, dan hasil akhir setelah prompt video diproses."
                      howToUse="Kalau hasilnya kurang pas, ubah brief utama atau buka settings. Kalau sudah pas, copy hasil storyboard lalu lanjut ke publish."
                    />
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Storyboard dan preview motion ditampilkan di sini.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVideoPreview((current) => !current)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {showVideoPreview ? 'Sembunyikan preview' : 'Lihat preview'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>{videoPlatform}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{videoDuration}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{videoMotion}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{currentPresetLabel}</span>
              </div>

              {showVideoPreview ? (
                <div className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                  {generatedVideoUrl ? (
                    <video src={generatedVideoUrl} controls className="w-full rounded-[24px] bg-black shadow-sm" />
                  ) : (
                    <img src={videoPreview} alt="Video preview" className="w-full rounded-[24px] object-cover shadow-sm" />
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className={`text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {generatedVideoUrl ? 'Ini hasil video asli dari OpenRouter.' : videoJob ? `Job video ${videoJob.status}. Klik refresh status sampai completed.` : 'Preview ini mood board. Generate dengan API key OpenRouter untuk membuat video asli.'}
                    </p>
                    {videoJob && !generatedVideoUrl ? (
                      <button
                        type="button"
                        onClick={() => void refreshVideoJobStatus(videoJob.id)}
                        disabled={loadingKey !== null}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {loadingKey === 'video-status' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        Refresh status
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
                    <select value={providerConfig.imageModel || imageModelOptions[0]?.id || ''} onChange={(e) => updateProviderConfig({ imageModel: e.target.value })} className={fieldClass}>
                      {imageModelOptions.map((model) => <option key={model.id} value={model.id}>{getModelLabel(model)}</option>)}
                    </select>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Khusus untuk Visual Brief / lane foto.</p>
                  </label>
                  <label className="space-y-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <PlaySquare size={14} className="text-fuchsia-500" />
                      Model video
                    </span>
                    <select value={providerConfig.videoModel || videoModelOptions[0]?.id || ''} onChange={(e) => updateProviderConfig({ videoModel: e.target.value })} className={fieldClass}>
                      {videoModelOptions.map((model) => <option key={model.id} value={model.id}>{getModelLabel(model)}</option>)}
                    </select>
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

      {showStudioSettings ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className={`max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[28px] p-5 md:p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border border-slate-200 shadow-2xl'}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Studio Settings</p>
                <h3 className="mt-1 text-xl font-bold">Pengaturan lanjutan</h3>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Area ini sengaja dipisah. User biasa cukup fokus ke media, prompt, model, lalu generate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStudioSettings(false)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Tutup
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 size={16} className="text-blue-500" />
                  <p className="text-sm font-bold">OpenRouter</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">API key</span>
                    <input
                      type="password"
                      value={providerConfig.apiKey}
                      onChange={(e) => updateProviderConfig({ apiKey: e.target.value })}
                      placeholder={providerMeta.envKey ? `Bisa pakai env ${providerMeta.envKey} atau isi manual di sini` : 'Isi API key manual'}
                      className={fieldClass}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Model umum</span>
                    <input value={providerConfig.model} onChange={(e) => updateProviderConfig({ model: e.target.value })} className={fieldClass} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Model foto</span>
                    <select value={providerConfig.imageModel || imageModelOptions[0]?.id || ''} onChange={(e) => updateProviderConfig({ imageModel: e.target.value })} className={fieldClass}>
                      {imageModelOptions.map((model) => <option key={model.id} value={model.id}>{getModelLabel(model)}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold">Model video</span>
                    <select value={providerConfig.videoModel || videoModelOptions[0]?.id || ''} onChange={(e) => updateProviderConfig({ videoModel: e.target.value })} className={fieldClass}>
                      {videoModelOptions.map((model) => <option key={model.id} value={model.id}>{getModelLabel(model)}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" />
                  <p className="text-sm font-bold">{isVideoLane ? 'Detail video' : 'Detail foto'}</p>
                </div>

                {isVideoLane ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {VIDEO_MOTIONS.map((item) => <ChoicePill key={item} active={videoMotion === item} label={item} onClick={() => setVideoMotion(item)} isDark={isDark} />)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {VIDEO_DURATIONS.map((item) => <ChoicePill key={item} active={videoDuration === item} label={item} onClick={() => setVideoDuration(item)} isDark={isDark} />)}
                    </div>
                    <input value={videoPlatform} onChange={(e) => setVideoPlatform(e.target.value)} placeholder="Platform target, misal TikTok / Reels / Shorts" className={fieldClass} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={3} placeholder="Negative prompt" className={`${fieldClass} min-h-[92px] resize-y leading-6`} />
                    <div className="flex flex-wrap gap-2">
                      {ART_STYLES.map((item) => <ChoicePill key={item} active={artStyle === item} label={item} onClick={() => setArtStyle(item)} isDark={isDark} />)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ASPECT_RATIOS.map((item) => <ChoicePill key={item} active={aspectRatio === item} label={item} onClick={() => setAspectRatio(item)} isDark={isDark} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`mt-4 rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-200'}`}>
              <p className="text-sm font-bold">Tool tambahan</p>
              <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kalau butuh brainstorming atau blueprint, buka tool ini secara terpisah.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setActiveTab('copy'); setShowStudioSettings(false); }} className={`rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}>Copy Lab</button>
                <button type="button" onClick={() => { setActiveTab('campaign'); setShowStudioSettings(false); }} className={`rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}>Campaign</button>
                <button type="button" onClick={() => { setActiveTab('copilot'); setShowStudioSettings(false); }} className={`rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}>Copilot</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}











