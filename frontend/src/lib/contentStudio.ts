export const CONTENT_STUDIO_STORAGE_KEY = 'mycommersocial_content_studio_v1';

export const CONTENT_TYPES = [
  'Caption Instagram',
  'Thread X / Twitter',
  'Email Launch',
  'Deskripsi Produk',
  'Script Video',
] as const;

export const COPY_TONES = [
  'Tajam & meyakinkan',
  'Santai bergaya kreator',
  'Premium & elegan',
  'Hard-sell terukur',
] as const;

export const ART_STYLES = [
  'Cinematic',
  'Photorealistic',
  'Editorial',
  'Cyberpunk',
  'Minimalist',
  'Luxury Product',
] as const;

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
export const VIDEO_DURATIONS = ['15 detik', '30 detik', '45 detik', '60 detik'] as const;
export const VIDEO_MOTIONS = [
  'Slow dolly in',
  'Crash zoom',
  'Orbit product',
  'Handheld UGC',
  'Reveal cinematic',
] as const;
export const CAMPAIGN_GOALS = ['Konversi', 'Awareness', 'Leads', 'Retargeting'] as const;
export const PROVIDER_IDS = ['openrouter', 'openai', 'anthropic', 'gemini', 'compatible', 'demo'] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderRuntimeConfig {
  apiKey: string;
  model: string;
  imageModel?: string;
  videoModel?: string;
  baseUrl: string;
}

export type ProviderConfigMap = Record<ProviderId, ProviderRuntimeConfig>;

export interface ProviderMeta {
  label: string;
  description: string;
  envKey: string | null;
  defaultModel: string;
  baseUrl: string;
  supportsBaseUrl: boolean;
  badge: string;
}

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  openrouter: {
    label: 'OpenRouter',
    description: 'Satu pintu ke banyak model seperti OpenAI, Claude, dan Gemini.',
    envKey: 'VITE_OPENROUTER_API_KEY',
    defaultModel: 'google/gemini-2.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsBaseUrl: false,
    badge: 'Multi-model',
  },
  openai: {
    label: 'OpenAI',
    description: 'Provider native untuk copy dan workflow teks modern.',
    envKey: 'VITE_OPENAI_API_KEY',
    defaultModel: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1',
    supportsBaseUrl: false,
    badge: 'Responses',
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude untuk reasoning dan writing yang lebih mendalam.',
    envKey: 'VITE_ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    baseUrl: 'https://api.anthropic.com/v1',
    supportsBaseUrl: false,
    badge: 'Claude',
  },
  gemini: {
    label: 'Google Gemini',
    description: 'Gemini API untuk workflow cepat dan ideasi ringan.',
    envKey: 'VITE_GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsBaseUrl: false,
    badge: 'Google AI',
  },
  compatible: {
    label: 'OpenAI-Compatible',
    description: 'Untuk Groq, Together, Fireworks, atau endpoint kompatibel lain.',
    envKey: 'VITE_COMPATIBLE_API_KEY',
    defaultModel: 'your-model-name',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsBaseUrl: true,
    badge: 'Custom',
  },
  demo: {
    label: 'Demo Mode',
    description: 'Tidak request live ke provider. Cocok untuk belajar workflow dulu.',
    envKey: null,
    defaultModel: 'demo-local',
    baseUrl: '',
    supportsBaseUrl: false,
    badge: 'Offline',
  },
};

export function createDefaultProviderConfigs(): ProviderConfigMap {
  return {
    openrouter: {
      apiKey: '',
      model: PROVIDER_META.openrouter.defaultModel,
      imageModel: 'google/gemini-3.1-flash-image-preview',
      videoModel: 'google/veo-3.1',
      baseUrl: PROVIDER_META.openrouter.baseUrl,
    },
    openai: { apiKey: '', model: PROVIDER_META.openai.defaultModel, imageModel: PROVIDER_META.openai.defaultModel, videoModel: PROVIDER_META.openai.defaultModel, baseUrl: PROVIDER_META.openai.baseUrl },
    anthropic: { apiKey: '', model: PROVIDER_META.anthropic.defaultModel, imageModel: PROVIDER_META.anthropic.defaultModel, videoModel: PROVIDER_META.anthropic.defaultModel, baseUrl: PROVIDER_META.anthropic.baseUrl },
    gemini: { apiKey: '', model: PROVIDER_META.gemini.defaultModel, imageModel: PROVIDER_META.gemini.defaultModel, videoModel: PROVIDER_META.gemini.defaultModel, baseUrl: PROVIDER_META.gemini.baseUrl },
    compatible: {
      apiKey: '',
      model: PROVIDER_META.compatible.defaultModel,
      imageModel: PROVIDER_META.compatible.defaultModel,
      videoModel: PROVIDER_META.compatible.defaultModel,
      baseUrl: import.meta.env.VITE_COMPATIBLE_BASE_URL || PROVIDER_META.compatible.baseUrl,
    },
    demo: { apiKey: '', model: PROVIDER_META.demo.defaultModel, imageModel: PROVIDER_META.demo.defaultModel, videoModel: PROVIDER_META.demo.defaultModel, baseUrl: PROVIDER_META.demo.baseUrl },
  };
}

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getEnvApiKey(providerId: ProviderId): string {
  if (providerId === 'demo') return '';

  const envMap: Record<Exclude<ProviderId, 'demo'>, string | undefined> = {
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
    openai: import.meta.env.VITE_OPENAI_API_KEY,
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
    gemini: import.meta.env.VITE_GEMINI_API_KEY,
    compatible: import.meta.env.VITE_COMPATIBLE_API_KEY,
  };

  return envMap[providerId] ?? '';
}

function extractMessageContent(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part === 'object' && part !== null && 'text' in part && typeof (part as { text?: string }).text === 'string') {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

function splitSystemPrompt(messages: OpenRouterMessage[]) {
  return messages.reduce(
    (accumulator, message) => {
      if (message.role === 'system') {
        accumulator.systemPrompt = accumulator.systemPrompt
          ? `${accumulator.systemPrompt}\n\n${message.content}`
          : message.content;
      } else {
        accumulator.turns.push({ role: message.role, content: message.content });
      }
      return accumulator;
    },
    {
      systemPrompt: '',
      turns: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
    },
  );
}

function extractChatCompletionText(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Respons provider tidak valid.');
  }

  const completion = data as { choices?: Array<{ message?: { content?: unknown } }> };
  const text = extractMessageContent(completion.choices?.[0]?.message?.content);
  if (!text) throw new Error('Provider tidak mengembalikan konten teks yang bisa dipakai.');
  return text;
}

function extractOpenAIResponseText(data: unknown): string {
  if (typeof data !== 'object' || data === null) throw new Error('Respons OpenAI tidak valid.');

  const response = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const text = (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => (part.type === 'output_text' && typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  if (!text) throw new Error('OpenAI tidak mengembalikan teks yang bisa dipakai.');
  return text;
}

function extractAnthropicText(data: unknown): string {
  if (typeof data !== 'object' || data === null) throw new Error('Respons Anthropic tidak valid.');

  const response = data as { content?: Array<{ type?: string; text?: string }> };
  const text = (response.content ?? [])
    .map((part) => (part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  if (!text) throw new Error('Anthropic tidak mengembalikan teks yang bisa dipakai.');
  return text;
}

function extractGeminiText(data: unknown): string {
  if (typeof data !== 'object' || data === null) throw new Error('Respons Gemini tidak valid.');

  const response = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  if (!text) throw new Error('Gemini tidak mengembalikan teks yang bisa dipakai.');
  return text;
}

export async function requestProviderText(params: {
  providerId: ProviderId;
  config: ProviderRuntimeConfig;
  messages: OpenRouterMessage[];
}): Promise<string> {
  const { providerId, config, messages } = params;
  const providerMeta = PROVIDER_META[providerId];

  if (providerId === 'demo') {
    throw new Error('Mode demo tidak mengirim permintaan live ke provider.');
  }

  const apiKey = config.apiKey.trim() || getEnvApiKey(providerId);
  const model = config.model.trim() || providerMeta.defaultModel;
  const baseUrl = normalizeBaseUrl(config.baseUrl || providerMeta.baseUrl);
  const referer = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  if (!apiKey) throw new Error(`API key untuk ${providerMeta.label} belum diisi.`);
  if (providerId === 'compatible' && !baseUrl) throw new Error('Base URL provider kompatibel belum diisi.');

  switch (providerId) {
    case 'openrouter': {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': referer,
          'X-Title': 'OmniPilot AI Studio',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!response.ok) throw new Error('Permintaan ke OpenRouter gagal. Cek API key, model, atau limit akun.');
      return extractChatCompletionText(await response.json());
    }
    case 'openai': {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: messages }),
      });
      if (!response.ok) throw new Error('Permintaan ke OpenAI gagal. Periksa API key atau model.');
      return extractOpenAIResponseText(await response.json());
    }
    case 'anthropic': {
      const { systemPrompt, turns } = splitSystemPrompt(messages);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1800,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: turns,
        }),
      });
      if (!response.ok) throw new Error('Permintaan ke Anthropic gagal. Periksa API key atau model Claude.');
      return extractAnthropicText(await response.json());
    }
    case 'gemini': {
      const { systemPrompt, turns } = splitSystemPrompt(messages);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(systemPrompt ? { system_instruction: { parts: [{ text: systemPrompt }] } } : {}),
            contents: turns.map((turn) => ({
              role: turn.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: turn.content }],
            })),
          }),
        },
      );
      if (!response.ok) throw new Error('Permintaan ke Gemini gagal. Periksa API key Google AI atau model.');
      return extractGeminiText(await response.json());
    }
    case 'compatible': {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!response.ok) throw new Error('Permintaan ke provider kompatibel gagal. Cek base URL, API key, atau model.');
      return extractChatCompletionText(await response.json());
    }
    default:
      throw new Error('Provider belum dikenali oleh studio.');
  }
}

export function createCopyFallback(type: ContentType, tone: string, brief: string): string {
  const trimmedBrief = brief.trim() || 'brief umum brand';
  return [
    `# ${type}`,
    '',
    '## Big Idea',
    `${trimmedBrief} dibungkus dengan tone “${tone}” dan pembukaan yang langsung menekan rasa penasaran audiens.`,
    '',
    '## Draft Utama',
    `Masih jualan biasa? Saat brand lain sibuk bikin konten ramai, kamu bisa meluncur lebih cepat dengan konsep ${trimmedBrief.toLowerCase()}.`,
    'Bangun perhatian sejak detik pertama, tunjukkan manfaat nyata, lalu dorong aksi dengan CTA yang jelas dan nggak bertele-tele.',
    '',
    '## Hook Alternatif',
    '1. Kontenmu sepi bukan karena produk jelek — angle-nya belum nancep.',
    '2. Satu brief yang tepat bisa pecah jadi banyak aset yang tetap konsisten.',
    '3. Kalau 3 detik pertama gagal, sisa kontenmu hampir pasti ikut tenggelam.',
    '',
    '## CTA',
    'Simpan konsep ini, pakai untuk produksi berikutnya, lalu tes 2 versi hook dalam 24 jam.',
  ].join('\n');
}

export function createImageFallback(
  prompt: string,
  preset: string,
  style: string,
  ratio: AspectRatio,
  negative: string,
): string {
  return [
    `# Visual Brief · ${preset}`,
    '',
    '## Hero Prompt',
    `${prompt.trim()}, ${style.toLowerCase()} style, ${ratio} composition, ${preset.toLowerCase()} mood, premium lighting, sharp focal detail, production-ready art direction.`,
    '',
    '## Negative Prompt',
    negative.trim() || 'blur, low contrast, muddy colors, awkward anatomy, cluttered frame',
    '',
    '## Camera & Lighting',
    '- Angle: 3/4 hero shot dengan fokus subjek utama di foreground.',
    '- Light: rim light tipis + key light lembut untuk depth dan separasi.',
    '- Background: bersih, ada depth, tidak mencuri perhatian dari subjek.',
    '',
    '## Production Notes',
    '- Sisakan area kosong untuk headline dan CTA.',
    '- Pastikan warna utama brand tetap dominan di frame.',
    '- Output cocok dijadikan still hero, thumbnail, atau key visual campaign.',
  ].join('\n');
}

export function createVideoFallback(
  idea: string,
  motion: string,
  duration: string,
  platform: string,
): string {
  return [
    `# Storyboard · ${platform}`,
    '',
    '## Opening Hook (0-3 dtk)',
    `Mulai dengan visual paling mengejutkan dari ide “${idea.trim()}”, lalu dorong curiosity gap lewat teks overlay singkat.`,
    '',
    '## Motion Signature',
    `${motion} untuk memberi rasa premium dan mempertegas momen reveal.`,
    '',
    '## Beat Sheet',
    '1. Masalah / rasa penasaran muncul secepat mungkin.',
    '2. Reveal solusi atau produk inti.',
    '3. Tunjukkan benefit paling konkret dalam visual singkat.',
    '4. Social proof atau before-after cepat.',
    '5. CTA kuat dengan urgency ringan.',
    '',
    '## Durasi Final',
    `${duration} dengan ritme cepat, setiap beat maksimal 2-4 detik.`,
    '',
    '## Overlay Text',
    '- “Stop scroll.”',
    '- “Ini alasan kenapa angle biasa gagal.”',
    '- “Tes versi ini sekarang.”',
  ].join('\n');
}

export function createCampaignFallback(
  linkOrProduct: string,
  offer: string,
  audience: string,
  goal: string,
): string {
  const resolvedAudience = audience.trim() || 'audience inti';
  const resolvedOffer = offer.trim() || 'hasil yang cepat dan jelas';

  return [
    `# Campaign Blueprint · ${goal}`,
    '',
    '## Offer Frame',
    `${linkOrProduct.trim()} diposisikan sebagai solusi paling relevan untuk ${resolvedAudience} dengan pengait utama: ${resolvedOffer}.`,
    '',
    '## 3 Winning Angles',
    '1. Pain-led: tonjolkan masalah yang selama ini dibiarkan terlalu lama.',
    '2. Transformation-led: tunjukkan perubahan yang bisa dirasakan dalam waktu singkat.',
    '3. Proof-led: tampilkan bukti, testimonial, atau indikator hasil yang konkret.',
    '',
    '## Asset Stack',
    '- 1 hero ad untuk top of funnel',
    '- 2 UGC cuts untuk retargeting',
    '- 1 landing hero copy + CTA',
    '- 3 caption pendek untuk distribusi organik',
    '',
    '## CTA Direction',
    'Gunakan satu CTA utama yang langsung mengarah ke tindakan paling dekat dengan konversi.',
  ].join('\n');
}

export function createChatFallback(topic: string): string {
  return [
    'Siap. Untuk mode advanced, fokuskan brief ke tiga hal:',
    `1. Hook utama untuk topik “${topic.trim() || 'campaign ini'}”.`,
    '2. Visual atau proof paling kuat yang bisa ditampilkan cepat.',
    '3. CTA tunggal yang ingin dipaksa keluar dari audiens.',
    '',
    'Kalau tiga hal itu tajam, output image/video/copy akan jauh lebih enak dieksekusi.',
  ].join('\n');
}

export function buildPreviewSvg(
  title: string,
  subtitle: string,
  badge: string,
  seed: string,
): string {
  const hue = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const bgA = `hsl(${hue} 82% 62%)`;
  const bgB = `hsl(${(hue + 48) % 360} 78% 54%)`;
  const accent = `hsl(${(hue + 112) % 360} 100% 80%)`;
  const safeTitle = escapeForSvg(title || 'Studio Preview');
  const safeSubtitle = escapeForSvg(subtitle || 'AI-assisted draft');
  const safeBadge = escapeForSvg(badge);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${bgA}" />
          <stop offset="100%" stop-color="${bgB}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="38%" r="58%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.9)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="760" rx="54" fill="url(#bg)" />
      <circle cx="982" cy="160" r="180" fill="url(#glow)" opacity="0.78" />
      <circle cx="250" cy="620" r="230" fill="${accent}" opacity="0.16" />
      <rect x="72" y="84" width="1056" height="592" rx="38" fill="rgba(5,10,27,0.18)" stroke="rgba(255,255,255,0.22)" />
      <rect x="112" y="120" width="180" height="46" rx="23" fill="rgba(255,255,255,0.12)" />
      <text x="202" y="149" fill="white" font-family="Inter, Arial, sans-serif" font-size="20" text-anchor="middle">${safeBadge}</text>
      <text x="112" y="260" fill="white" font-family="Inter, Arial, sans-serif" font-size="66" font-weight="700">${safeTitle}</text>
      <text x="112" y="326" fill="rgba(255,255,255,0.86)" font-family="Inter, Arial, sans-serif" font-size="26">${safeSubtitle}</text>
      <rect x="112" y="414" width="974" height="138" rx="32" fill="rgba(255,255,255,0.12)" />
      <rect x="154" y="452" width="484" height="18" rx="9" fill="rgba(255,255,255,0.22)" />
      <rect x="154" y="488" width="390" height="18" rx="9" fill="rgba(255,255,255,0.18)" />
      <rect x="810" y="446" width="220" height="80" rx="26" fill="rgba(255,255,255,0.18)" />
      <path d="M770 232l128 78-128 80-126-80z" fill="rgba(255,255,255,0.78)" />
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeForSvg(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

