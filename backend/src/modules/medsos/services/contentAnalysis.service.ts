import prisma from '../../../utils/prisma';

const OPENROUTER_ENDPOINT = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/auto';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 900;

type TenantAiAnalysisSettings = {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemMessages?: {
    postAnalysis?: string;
    contentGeneration?: string;
    inboxReply?: string;
  };
};

type PostAnalysisResult = {
  analysis: string;
  generatedAt: string;
  model: string;
};

type PromptAnalyticsShape = {
  impressions?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  engagement_rate?: number | null;
};

type PromptPostShape = {
  content?: string | null;
  platform?: string | null;
  status?: string | null;
  scheduled_at?: string | Date | null;
  published_at?: string | Date | null;
  external_id?: string | null;
  social_accounts?: {
    account_name?: string | null;
    platform?: string | null;
  } | null;
  social_analytics?: PromptAnalyticsShape | null;
};

type AnalysisRequestInput =
  | number
  | {
      postId?: number | null;
      postSnapshot?: unknown;
    };

type ChatCompletionResponse = {
  model?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: { message?: string } | string;
  choices?: Array<{
    text?: string;
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      reasoning?: string;
    };
  }>;
};

type ChatMessageContent = string | Array<{ type?: string; text?: string }> | undefined;

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function extractSettings(rawSettings: unknown): TenantAiAnalysisSettings {
  if (!isPlainObject(rawSettings)) {
    return {};
  }

  const workspaceSettings = isPlainObject(rawSettings.myCommerSocialSettings)
    ? rawSettings.myCommerSocialSettings
    : null;
  const aiAnalysis = workspaceSettings && isPlainObject(workspaceSettings.aiAnalysis)
    ? workspaceSettings.aiAnalysis
    : null;

  if (!aiAnalysis) {
    return {};
  }

  return {
    apiKey: typeof aiAnalysis.apiKey === 'string' ? aiAnalysis.apiKey.trim() : undefined,
    model: typeof aiAnalysis.model === 'string' ? aiAnalysis.model.trim() : undefined,
    temperature: clampNumber(aiAnalysis.temperature, 0, 2, DEFAULT_TEMPERATURE),
    maxTokens: Math.trunc(clampNumber(aiAnalysis.maxTokens, 200, 4000, DEFAULT_MAX_TOKENS)),
    systemMessages: isPlainObject(aiAnalysis.systemMessages) ? aiAnalysis.systemMessages : undefined,
  };
}

function normalizeContent(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Tanpa deskripsi.';
  return compact;
}

function firstParagraph(text: string) {
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean)[0] || text;
}

function readMessageContent(content: ChatMessageContent | { text?: string } | null) {
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || '').join('\n').trim();
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text.trim();
  }
  return '';
}

function extractAnalysisText(data: ChatCompletionResponse) {
  const choice = data.choices?.[0];

  const directMessage = readMessageContent(choice?.message?.content);
  if (directMessage) return directMessage;

  const directText = typeof choice?.text === 'string' ? choice.text.trim() : '';
  if (directText) return directText;

  const reasoningText = typeof choice?.message?.reasoning === 'string' ? choice.message.reasoning.trim() : '';
  if (reasoningText) return reasoningText;

  const outputText = typeof data.output_text === 'string' ? data.output_text.trim() : '';
  if (outputText) return outputText;

  if (Array.isArray(data.output)) {
    const joined = data.output
      .flatMap((item) => item?.content ?? [])
      .map((part) => part?.text || '')
      .join('\n')
      .trim();

    if (joined) return joined;
  }

  return '';
}

async function requestAnalysisCompletion(
  apiKey: string,
  requestBody: Record<string, unknown>,
  frontendBase: string,
) {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(frontendBase ? { 'HTTP-Referer': frontendBase } : {}),
      'X-Title': 'MyCommerSocial',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20000),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    const message = typeof data.error === 'string'
      ? data.error
      : data.error?.message || `Analysis request gagal (${response.status})`;
    throw new Error(message);
  }

  return {
    data,
    analysis: extractAnalysisText(data),
  };
}

function buildPrompt(post: PromptPostShape) {
  const analytics = post.social_analytics || {};
  const channelName = post.social_accounts?.account_name || post.platform || 'social';
  const caption = normalizeContent(post.content || '');
  const summary = firstParagraph(caption);

  return [
    'Anda adalah analis performa konten untuk dashboard bisnis.',
    'Tulis jawaban dalam Bahasa Indonesia yang ringkas, langsung, dan fokus tindakan.',
    'Hindari pembukaan panjang dan hindari istilah teknis yang tidak perlu.',
    '',
    'Gunakan format ini:',
    '1. Ringkasan singkat',
    '2. Yang bekerja',
    '3. Yang perlu dibenahi',
    '4. Rekomendasi eksperimen berikutnya',
    '',
    `Platform: ${post.platform}`,
    `Akun/channel: ${channelName}`,
    `Status post: ${post.status}`,
    `Jadwal publish: ${post.published_at || post.scheduled_at || 'belum ada'}`,
    `Deskripsi singkat: ${summary}`,
    `Caption lengkap: ${caption}`,
    '',
    'Metrik yang tersedia:',
    `- Impressions/Views: ${analytics.impressions ?? 0}`,
    `- Reach: ${analytics.reach ?? 0}`,
    `- Likes: ${analytics.likes ?? 0}`,
    `- Comments: ${analytics.comments ?? 0}`,
    `- Shares: ${analytics.shares ?? 0}`,
    `- Saves: ${analytics.saves ?? 0}`,
    `- Engagement rate: ${analytics.engagement_rate ?? 0}`,
    '',
    'Berikan insight yang realistis terhadap konten ini saja, bukan saran generik untuk semua konten.',
  ].join('\n');
}

function toPromptPostSnapshot(raw: unknown): PromptPostShape | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  return {
    content: typeof raw.content === 'string' ? raw.content : '',
    platform: typeof raw.platform === 'string' ? raw.platform : 'instagram',
    status: typeof raw.status === 'string' ? raw.status : 'published',
    scheduled_at: typeof raw.scheduled_at === 'string' || raw.scheduled_at instanceof Date ? raw.scheduled_at : null,
    published_at: typeof raw.published_at === 'string' || raw.published_at instanceof Date ? raw.published_at : null,
    external_id: typeof raw.external_id === 'string' ? raw.external_id : null,
    social_accounts: isPlainObject(raw.social_accounts)
      ? {
          account_name: typeof raw.social_accounts.account_name === 'string' ? raw.social_accounts.account_name : null,
          platform: typeof raw.social_accounts.platform === 'string' ? raw.social_accounts.platform : null,
        }
      : null,
    social_analytics: isPlainObject(raw.social_analytics)
      ? {
          impressions: Number(raw.social_analytics.impressions ?? 0) || 0,
          reach: Number(raw.social_analytics.reach ?? 0) || 0,
          likes: Number(raw.social_analytics.likes ?? 0) || 0,
          comments: Number(raw.social_analytics.comments ?? 0) || 0,
          shares: Number(raw.social_analytics.shares ?? 0) || 0,
          saves: Number(raw.social_analytics.saves ?? 0) || 0,
          engagement_rate: Number(raw.social_analytics.engagement_rate ?? 0) || 0,
        }
      : null,
  };
}

export async function generatePostPerformanceAnalysis(tenantId: number, input: AnalysisRequestInput): Promise<PostAnalysisResult> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      settings: true,
    },
  });

  if (!tenant) {
    throw new Error('Tenant tidak ditemukan.');
  }

  const settings = extractSettings(tenant.settings);
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || process.env.MYCOMMERSOCIAL_ANALYSIS_API_KEY || '';

  if (!apiKey) {
    throw new Error('API key analysis belum disimpan di settings.');
  }

  const parsedInput = typeof input === 'number' ? { postId: input, postSnapshot: undefined } : input;
  const postId = typeof parsedInput.postId === 'number' ? parsedInput.postId : Number(parsedInput.postId);

  let post: PromptPostShape | null = null;

  if (Number.isFinite(postId) && postId > 0) {
    post = (await prisma.social_posts.findFirst({
      where: {
        id: postId,
        tenant_id: tenantId,
      },
      include: {
        social_accounts: {
          select: {
            account_name: true,
            platform: true,
          },
        },
        social_analytics: true,
      },
    })) as PromptPostShape | null;
  }

  if (!post && parsedInput.postSnapshot) {
    post = toPromptPostSnapshot(parsedInput.postSnapshot);
  }

  if (!post) {
    throw new Error('Post tidak ditemukan.');
  }

  const messages: any[] = [];
  
  const systemMsg = settings.systemMessages?.postAnalysis;
  if (systemMsg) {
    messages.push({
      role: 'system',
      content: systemMsg,
    });
  }

  messages.push({
    role: 'user',
    content: buildPrompt(post),
  });

  const requestBody = {
    model: settings.model || DEFAULT_MODEL,
    temperature: settings.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: settings.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages,
  };

  const frontendBase = (process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || '').split(',')[0].trim();
  let completion = await requestAnalysisCompletion(apiKey, requestBody, frontendBase);
  let analysis = completion.analysis;
  let resolvedModel = completion.data.model || String(requestBody.model);

  if (!analysis && requestBody.model !== DEFAULT_MODEL) {
    completion = await requestAnalysisCompletion(apiKey, {
      ...requestBody,
      model: DEFAULT_MODEL,
    }, frontendBase);
    analysis = completion.analysis;
    resolvedModel = completion.data.model || DEFAULT_MODEL;
  }

  if (!analysis) {
    throw new Error(`Model analysis mengembalikan respons kosong. Coba preset Auto atau model chat OpenRouter lain.`);
  }

  return {
    analysis,
    generatedAt: new Date().toISOString(),
    model: resolvedModel,
  };
}

export async function generateCaption(tenantId: number, prompt: string): Promise<string> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      settings: true,
    },
  });

  if (!tenant) throw new Error('Tenant tidak ditemukan.');

  const settings = extractSettings(tenant.settings);
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || process.env.MYCOMMERSOCIAL_ANALYSIS_API_KEY || '';

  if (!apiKey) throw new Error('API key analysis belum disimpan di settings.');

  const messages: any[] = [];
  const systemMsg = settings.systemMessages?.contentGeneration;
  if (systemMsg) {
    messages.push({ role: 'system', content: systemMsg });
  }

  messages.push({
    role: 'user',
    content: `Buat caption media sosial berdasarkan instruksi ini: ${prompt}. Tuliskan hanya isi captionnya saja.`,
  });

  const requestBody = {
    model: settings.model || DEFAULT_MODEL,
    temperature: settings.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: settings.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages,
  };

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'MyCommerSocial',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20000),
  });

  const data = (await response.json()) as ChatCompletionResponse;
  if (!response.ok) throw new Error('AI request failed');

  return readMessageContent(data.choices?.[0]?.message?.content) || '';
}

export async function generateInboxReply(tenantId: number, conversationContext: string): Promise<string> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) throw new Error('Tenant tidak ditemukan.');

  const settings = extractSettings(tenant.settings);
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || process.env.MYCOMMERSOCIAL_ANALYSIS_API_KEY || '';

  if (!apiKey) throw new Error('API key analysis belum disimpan di settings.');

  const messages: any[] = [];
  const systemMsg = settings.systemMessages?.inboxReply;
  if (systemMsg) {
    messages.push({ role: 'system', content: systemMsg });
  }

  messages.push({
    role: 'user',
    content: `Berikut adalah konteks percakapan terakhir: ${conversationContext}. Berikan saran balasan singkat dan ramah kepada pelanggan. Tuliskan hanya isi balasannya saja.`,
  });

  const requestBody = {
    model: settings.model || DEFAULT_MODEL,
    temperature: settings.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: settings.maxTokens ?? 500,
    messages,
  };

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'MyCommerSocial',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(20000),
  });

  const data = (await response.json()) as ChatCompletionResponse;
  if (!response.ok) throw new Error('AI request failed');

  return readMessageContent(data.choices?.[0]?.message?.content) || '';
}
