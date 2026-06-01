import api from './api';

export interface ContentStudioModelOption {
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

export interface ContentStudioModelListResponse {
  models: ContentStudioModelOption[];
  source: 'openrouter' | 'fallback';
  warning?: string;
}

export interface GenerateImagePayload {
  apiKey?: string;
  model: string;
  prompt: string;
  aspectRatio?: string;
  negativePrompt?: string;
  referenceImage?: string | null;
}

export interface GenerateImageResponse {
  model: string;
  imageUrls: string[];
  text?: string;
}

export interface GenerateVideoPayload {
  apiKey?: string;
  model: string;
  prompt: string;
  aspectRatio?: string;
  duration?: string;
  resolution?: string;
  generateAudio?: boolean;
}

export interface GenerateVideoResponse {
  model: string;
  job: {
    id: string;
    polling_url?: string;
    status: 'pending' | 'queued' | 'running' | 'processing' | 'completed' | 'failed' | string;
    generation_id?: string;
    unsigned_urls?: string[];
    error?: string;
    usage?: Record<string, unknown>;
  };
}

export async function getOpenRouterImageModels(apiKey?: string): Promise<ContentStudioModelListResponse> {
  const { data } = await api.post('/medsos/content-studio/models/image', { apiKey });
  return data.data as ContentStudioModelListResponse;
}

export async function getOpenRouterVideoModels(apiKey?: string): Promise<ContentStudioModelListResponse> {
  const { data } = await api.post('/medsos/content-studio/models/video', { apiKey });
  return data.data as ContentStudioModelListResponse;
}

export async function generateOpenRouterImage(payload: GenerateImagePayload): Promise<GenerateImageResponse> {
  const { data } = await api.post('/medsos/content-studio/generate-image', payload);
  return data.data as GenerateImageResponse;
}

export async function generateOpenRouterVideo(payload: GenerateVideoPayload): Promise<GenerateVideoResponse> {
  const { data } = await api.post('/medsos/content-studio/generate-video', payload);
  return data.data as GenerateVideoResponse;
}

export async function getOpenRouterVideoStatus(apiKey: string | undefined, jobId: string): Promise<GenerateVideoResponse['job']> {
  const { data } = await api.post('/medsos/content-studio/video-status', { apiKey, jobId });
  return data.data as GenerateVideoResponse['job'];
}
