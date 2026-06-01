import { Router, type Request, type Response, type NextFunction } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface StudioModelOption {
  id: string;
  name: string;
  description?: string;
  canonicalSlug?: string;
  outputModalities?: string[];
  inputModalities?: string[];
  contextLength?: number | null;
  pricing?: Record<string, unknown> | null;
  supportedParameters?: string[];
  supportedAspectRatios?: string[];
  supportedDurations?: number[];
  supportedResolutions?: string[];
  generateAudio?: boolean;
}

const imageFallbackModels: StudioModelOption[] = [
  {
    id: 'x-ai/grok-imagine-image-quality',
    name: 'xAI: Grok Imagine Image Quality',
    description: 'High-quality image generation option from OpenRouter.',
    outputModalities: ['image'],
  },
  {
    id: 'recraft/recraft-v4.1-pro',
    name: 'Recraft: Recraft V4.1 Pro',
    description: 'Design/brand visual generator, useful for product and ad assets.',
    outputModalities: ['image'],
  },
  {
    id: 'openai/gpt-5.4-image-2',
    name: 'OpenAI: GPT-5.4 Image 2',
    description: 'OpenAI image model exposed by OpenRouter when account access is available.',
    outputModalities: ['image', 'text'],
  },
  {
    id: 'google/gemini-3.1-flash-image-preview',
    name: 'Google: Nano Banana 2 / Gemini 3.1 Flash Image Preview',
    description: 'Fast image generation/editing lane.',
    outputModalities: ['image', 'text'],
  },
  {
    id: 'sourceful/riverflow-v2-pro',
    name: 'Sourceful: Riverflow V2 Pro',
    description: 'Image generation option for polished creative direction.',
    outputModalities: ['image'],
  },
  {
    id: 'black-forest-labs/flux.2-max',
    name: 'Black Forest Labs: FLUX.2 Max',
    description: 'FLUX family model for high quality visual generation.',
    outputModalities: ['image'],
  },
  {
    id: 'bytedance-seed/seedream-4.5',
    name: 'ByteDance Seed: Seedream 4.5',
    description: 'Image model from ByteDance Seed for creative content assets.',
    outputModalities: ['image'],
  },
];

const videoFallbackModels: StudioModelOption[] = [
  {
    id: 'x-ai/grok-imagine-video',
    name: 'xAI: Grok Imagine Video',
    description: 'Video generation option from OpenRouter.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: true,
  },
  {
    id: 'kwaivgi/kling-v3.0-pro',
    name: 'Kling: Video v3.0 Pro',
    description: 'Kling pro video generation model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'kwaivgi/kling-v3.0-std',
    name: 'Kling: Video v3.0 Standard',
    description: 'Kling standard video generation model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'google/veo-3.1-fast',
    name: 'Google: Veo 3.1 Fast',
    description: 'Veo fast mode for faster drafts.',
    supportedAspectRatios: ['16:9'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: true,
  },
  {
    id: 'google/veo-3.1-lite',
    name: 'Google: Veo 3.1 Lite',
    description: 'Veo lite mode for lighter drafts.',
    supportedAspectRatios: ['16:9'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: true,
  },
  {
    id: 'kwaivgi/kling-video-o1',
    name: 'Kling: Video O1',
    description: 'Kling O1 video model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'minimax/hailuo-2.3',
    name: 'MiniMax: Hailuo 2.3',
    description: 'MiniMax Hailuo video model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'bytedance/seedance-2.0-fast',
    name: 'ByteDance: Seedance 2.0 Fast',
    description: 'Fast ByteDance Seedance video model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'alibaba/wan-2.7',
    name: 'Alibaba: Wan 2.7',
    description: 'Alibaba Wan video model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'bytedance/seedance-2.0',
    name: 'ByteDance: Seedance 2.0',
    description: 'ByteDance Seedance video generation model.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: false,
  },
  {
    id: 'openai/sora-2-pro',
    name: 'OpenAI: Sora 2 Pro',
    description: 'OpenAI Sora video model if account access is available.',
    supportedAspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: true,
  },
  {
    id: 'google/veo-3.1',
    name: 'Google: Veo 3.1',
    description: 'Google Veo 3.1 standard.',
    supportedAspectRatios: ['16:9'],
    supportedDurations: [5, 8],
    supportedResolutions: ['720p'],
    generateAudio: true,
  },
];

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const resolveApiKey = (req: Request, required = true) => {
  const bodyKey = asString(req.body?.apiKey);
  const headerKey = asString(req.headers['x-openrouter-api-key']);
  const envKey = process.env.OPENROUTER_API_KEY || process.env.MCS_OPENROUTER_API_KEY || '';
  const apiKey = bodyKey || headerKey || envKey;

  if (required && !apiKey) {
    const error = new Error('OpenRouter API key belum diisi. Isi key di Studio Settings dulu.');
    (error as any).statusCode = 400;
    throw error;
  }

  return apiKey;
};

const openRouterHeaders = (apiKey?: string) => ({
  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  'HTTP-Referer': process.env.PUBLIC_URL || 'https://omnipilot.ai',
  'X-Title': 'OmniPilot AI Content Studio',
  'Content-Type': 'application/json',
});

async function parseOpenRouterResponse(response: globalThis.Response) {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data === 'string' && data.trim() ? data.trim().slice(0, 220) : '') ||
      `OpenRouter request gagal (${response.status}).`;
    const error = new Error(message);
    (error as any).statusCode = response.status;
    throw error;
  }

  return data;
}

const mapImageModel = (model: any): StudioModelOption => ({
  id: String(model?.id || model?.canonical_slug || ''),
  name: String(model?.name || model?.id || 'OpenRouter image model'),
  description: typeof model?.description === 'string' ? model.description : undefined,
  canonicalSlug: typeof model?.canonical_slug === 'string' ? model.canonical_slug : undefined,
  inputModalities: Array.isArray(model?.architecture?.input_modalities) ? model.architecture.input_modalities : undefined,
  outputModalities: Array.isArray(model?.architecture?.output_modalities) ? model.architecture.output_modalities : undefined,
  contextLength: Number.isFinite(Number(model?.context_length)) ? Number(model.context_length) : null,
  pricing: model?.pricing ?? null,
  supportedParameters: Array.isArray(model?.supported_parameters) ? model.supported_parameters : undefined,
});

const mapVideoModel = (model: any): StudioModelOption => ({
  id: String(model?.id || model?.canonical_slug || ''),
  name: String(model?.name || model?.id || 'OpenRouter video model'),
  description: typeof model?.description === 'string' ? model.description : undefined,
  canonicalSlug: typeof model?.canonical_slug === 'string' ? model.canonical_slug : undefined,
  contextLength: Number.isFinite(Number(model?.context_length)) ? Number(model.context_length) : null,
  supportedAspectRatios: Array.isArray(model?.supported_aspect_ratios) ? model.supported_aspect_ratios : undefined,
  supportedDurations: Array.isArray(model?.supported_durations) ? model.supported_durations : undefined,
  supportedResolutions: Array.isArray(model?.supported_resolutions) ? model.supported_resolutions : undefined,
  generateAudio: typeof model?.generate_audio === 'boolean' ? model.generate_audio : undefined,
  pricing: model?.pricing_skus ?? model?.pricing ?? null,
});

const buildPromptWithContext = (parts: Array<string | undefined | null>) =>
  parts.map((part) => asString(part)).filter(Boolean).join('\n');

const durationToSeconds = (value: string) => {
  const numeric = Number(String(value).match(/\d+/)?.[0] || '8');
  if (!Number.isFinite(numeric) || numeric <= 0) return 8;
  if (numeric <= 5) return 5;
  return 8;
};

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof Error) {
    const statusCode = Number((error as any).statusCode) || 500;
    if (statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({
        success: false,
        error: {
          code: 'CONTENT_STUDIO_OPENROUTER_ERROR',
          message: error.message,
        },
      });
    }
  }
  return next(error);
};

router.use(authMiddleware);
router.use(tenantMiddleware);

router.post('/models/image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = resolveApiKey(req, false);
    const response = await fetch(`${OPENROUTER_BASE_URL}/models?output_modalities=image`, {
      headers: openRouterHeaders(apiKey),
    });
    const payload = await parseOpenRouterResponse(response);
    const models = (Array.isArray(payload?.data) ? payload.data : [])
      .map(mapImageModel)
      .filter((model: StudioModelOption) => Boolean(model.id));

    return res.json({
      success: true,
      data: {
        models: models.length ? models : imageFallbackModels,
        source: models.length ? 'openrouter' : 'fallback',
      },
    });
  } catch (error) {
    return res.json({
      success: true,
      data: {
        models: imageFallbackModels,
        source: 'fallback',
        warning: error instanceof Error ? error.message : 'Gagal membaca model image OpenRouter.',
      },
    });
  }
});

router.post('/models/video', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = resolveApiKey(req, false);
    const response = await fetch(`${OPENROUTER_BASE_URL}/videos/models`, {
      headers: openRouterHeaders(apiKey),
    });
    const payload = await parseOpenRouterResponse(response);
    const models = (Array.isArray(payload?.data) ? payload.data : [])
      .map(mapVideoModel)
      .filter((model: StudioModelOption) => Boolean(model.id));

    return res.json({
      success: true,
      data: {
        models: models.length ? models : videoFallbackModels,
        source: models.length ? 'openrouter' : 'fallback',
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.post('/generate-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = resolveApiKey(req, true);
    const model = asString(req.body?.model) || imageFallbackModels[0].id;
    const prompt = asString(req.body?.prompt);
    const aspectRatio = asString(req.body?.aspectRatio) || '1:1';
    const negativePrompt = asString(req.body?.negativePrompt);
    const referenceImage = asString(req.body?.referenceImage);

    if (!prompt) {
      return res.status(400).json({ success: false, error: { code: 'PROMPT_REQUIRED', message: 'Prompt foto wajib diisi.' } });
    }

    const finalPrompt = buildPromptWithContext([
      prompt,
      negativePrompt ? `Negative prompt: ${negativePrompt}` : '',
      `Aspect ratio: ${aspectRatio}`,
      'Return a generated image and a short Indonesian production note.',
    ]);

    const content: any = referenceImage
      ? [
          { type: 'text', text: finalPrompt },
          { type: 'image_url', image_url: { url: referenceImage } },
        ]
      : finalPrompt;

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
        stream: false,
        image_config: { aspect_ratio: aspectRatio },
      }),
    });

    const payload = await parseOpenRouterResponse(response);
    const message = payload?.choices?.[0]?.message ?? {};
    const images = Array.isArray(message?.images) ? message.images : [];
    const imageUrls = images
      .map((item: any) => item?.image_url?.url || item?.imageUrl?.url || item?.url)
      .filter((url: unknown): url is string => typeof url === 'string' && Boolean(url));
    const text = typeof message?.content === 'string'
      ? message.content
      : Array.isArray(message?.content)
        ? message.content.map((part: any) => part?.text || '').join('\n').trim()
        : '';

    if (!imageUrls.length) {
      const error = new Error('Model tidak mengembalikan gambar. Pilih model dengan output_modalities image.');
      (error as any).statusCode = 400;
      throw error;
    }

    return res.json({
      success: true,
      data: {
        model,
        imageUrls,
        text,
        raw: payload,
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.post('/generate-video', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = resolveApiKey(req, true);
    const model = asString(req.body?.model) || videoFallbackModels[0].id;
    const prompt = asString(req.body?.prompt);
    const aspectRatio = asString(req.body?.aspectRatio) || '9:16';
    const duration = durationToSeconds(asString(req.body?.duration));
    const resolution = asString(req.body?.resolution) || '720p';
    const generateAudio = req.body?.generateAudio !== false;

    if (!prompt) {
      return res.status(400).json({ success: false, error: { code: 'PROMPT_REQUIRED', message: 'Prompt video wajib diisi.' } });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/videos`, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: aspectRatio,
        duration,
        resolution,
        generate_audio: generateAudio,
      }),
    });

    const payload = await parseOpenRouterResponse(response);
    return res.status(202).json({
      success: true,
      data: {
        model,
        job: payload,
      },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

router.post('/video-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = resolveApiKey(req, true);
    const jobId = asString(req.body?.jobId);
    if (!jobId) {
      return res.status(400).json({ success: false, error: { code: 'JOB_ID_REQUIRED', message: 'jobId video wajib dikirim.' } });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/videos/${encodeURIComponent(jobId)}`, {
      headers: openRouterHeaders(apiKey),
    });
    const payload = await parseOpenRouterResponse(response);

    return res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
});

export default router;

