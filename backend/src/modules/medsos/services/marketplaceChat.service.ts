import prisma from '../../../utils/prisma';
import { decrypt } from '../../../utils/crypto';
import {
  checkJubelioConnectionStatus,
  handOverJubelioRoom,
  sendJubelioBotMessage,
  verifyJubelioWebhookSignature,
} from './jubelioMarketplace.service';

type JsonRecord = Record<string, any>;

export interface MarketplaceChatChannel {
  id: string;
  name: string;
  source: string;
}

export interface MarketplaceHubConnectionStatus {
  configured: boolean;
  active: boolean;
  hasAppId: boolean;
  hasSecretKey: boolean;
  hasBotSenderEmail: boolean;
  hasAiWebhook: boolean;
  reachable: boolean;
  checkedAt: string;
  status: 'not_configured' | 'configuration_incomplete' | 'reachable' | 'degraded';
  message: string;
  workspaceName: string | null;
  appIdMasked: string | null;
  botSenderEmail: string | null;
  aiWebhookUrl: string | null;
  webhookUrl: string | null;
  channels: MarketplaceChatChannel[];
}

interface MarketplaceWebhookContext {
  tenantId?: number;
  token?: string;
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function decryptCredentials(value: unknown): JsonRecord {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const decrypted = decrypt(value);
      return asRecord(decrypted);
    } catch {
      return {};
    }
  }

  return asRecord(value);
}

function maskReference(reference?: string | null): string | null {
  if (!reference) {
    return null;
  }

  if (reference.length <= 8) {
    return `${reference.slice(0, 2)}***${reference.slice(-2)}`;
  }

  return `${reference.slice(0, 4)}••••${reference.slice(-4)}`;
}

function getBackendPublicUrl(): string {
  const configured = process.env.PUBLIC_URL || 'http://localhost:3000';
  return configured.replace(/\/$/, '');
}

function normalizeChannels(payload: unknown): MarketplaceChatChannel[] {
  const root = asRecord(payload);
  const arrays = [
    Array.isArray(root.data) ? root.data : null,
    Array.isArray(root.channels) ? root.channels : null,
    Array.isArray(asRecord(root.data).channels) ? asRecord(root.data).channels : null,
  ].filter(Boolean) as any[][];

  const channels = arrays[0] || [];
  return channels.map((item, index) => {
    const record = asRecord(item);
    return {
      id: String(record.id || record.channel_id || index + 1),
      name: String(record.name || record.channel_name || record.source || `Channel ${index + 1}`),
      source: String(record.source || record.channel || record.name || 'unknown'),
    };
  });
}

async function getMarketplaceRow(tenantId: number) {
  return prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: 'managed_marketplace_hub',
      },
    },
    select: {
      id: true,
      status: true,
      is_active: true,
      configuration: true,
      credentials: true,
      metadata: true,
      last_sync_at: true,
      updated_at: true,
    },
  });
}

async function updateMarketplaceMetadata(tenantId: number, updater: (current: {
  configuration: JsonRecord;
  credentials: JsonRecord;
  metadata: JsonRecord;
  status: string;
  isActive: boolean;
}) => {
  status?: string;
  isActive?: boolean;
  configuration?: JsonRecord;
  metadata?: JsonRecord;
  lastSyncAt?: Date | null;
}) {
  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: 'managed_marketplace_hub',
      },
    },
    select: {
      status: true,
      is_active: true,
      configuration: true,
      credentials: true,
      metadata: true,
    },
  });

  if (!row) {
    return;
  }

  const current = {
    configuration: asRecord(row.configuration),
    credentials: decryptCredentials(row.credentials),
    metadata: asRecord(row.metadata),
    status: row.status,
    isActive: row.is_active,
  };

  const next = updater(current);
  await prisma.integrations.update({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: 'managed_marketplace_hub',
      },
    },
    data: {
      status: next.status ?? row.status,
      is_active: next.isActive ?? row.is_active,
      configuration: next.configuration ?? row.configuration ?? {},
      metadata: next.metadata ?? row.metadata ?? {},
      last_sync_at: next.lastSyncAt ?? undefined,
      updated_at: new Date(),
    },
  });
}

export async function getMarketplaceHubConnectionStatus(tenantId: number): Promise<MarketplaceHubConnectionStatus> {
  const row = await getMarketplaceRow(tenantId);
  const configuration = asRecord(row?.configuration);
  const credentials = decryptCredentials(row?.credentials);
  const metadata = asRecord(row?.metadata);
  const appId = String(credentials.appId || credentials.connectionId || '').trim();
  const secretKey = String(credentials.secretKey || '').trim();
  const botSenderEmail = String(credentials.botSenderEmail || '').trim();
  const aiWebhookUrl = String(configuration.aiWebhookUrl || '').trim();
  const webhookToken = String(configuration.webhookToken || '').trim();
  const workspaceName = String(configuration.workspaceName || '').trim() || null;
  const webhookUrl = webhookToken
    ? `${getBackendPublicUrl()}/api/medsos/integrations/webhook/marketplace-hub?tenant_id=${tenantId}&token=${encodeURIComponent(webhookToken)}`
    : null;
  const checkedAt = new Date().toISOString();
  const configured = Boolean(row && (appId || secretKey || botSenderEmail || aiWebhookUrl || workspaceName));

  // suppress unused warning
  void metadata;

  if (!configured) {
    return {
      configured: false,
      active: Boolean(row?.is_active),
      hasAppId: false,
      hasSecretKey: false,
      hasBotSenderEmail: false,
      hasAiWebhook: false,
      reachable: false,
      checkedAt,
      status: 'not_configured',
      message: 'Marketplace chat engine belum dikonfigurasi.',
      workspaceName,
      appIdMasked: null,
      botSenderEmail: null,
      aiWebhookUrl: null,
      webhookUrl,
      channels: [],
    };
  }

  if (!appId || !secretKey || !botSenderEmail) {
    return {
      configured: true,
      active: Boolean(row?.is_active),
      hasAppId: Boolean(appId),
      hasSecretKey: Boolean(secretKey),
      hasBotSenderEmail: Boolean(botSenderEmail),
      hasAiWebhook: Boolean(aiWebhookUrl),
      reachable: false,
      checkedAt,
      status: 'configuration_incomplete',
      message: 'Marketplace chat sedang menunggu aktivasi lengkap dari tim onboarding.',
      workspaceName,
      appIdMasked: maskReference(appId),
      botSenderEmail: botSenderEmail || null,
      aiWebhookUrl: aiWebhookUrl || null,
      webhookUrl,
      channels: [],
    };
  }

  try {
    const jubelioResult = await checkJubelioConnectionStatus(credentials);
    const reachable = jubelioResult.reachable;
    const channels = normalizeChannels(jubelioResult.channels);
    const probeMessage = jubelioResult.message;

    const status: MarketplaceHubConnectionStatus = {
      configured: true,
      active: Boolean(row?.is_active),
      hasAppId: true,
      hasSecretKey: true,
      hasBotSenderEmail: true,
      hasAiWebhook: Boolean(aiWebhookUrl),
      reachable,
      checkedAt,
      status: reachable ? 'reachable' : 'degraded',
      message: probeMessage,
      workspaceName,
      appIdMasked: maskReference(appId),
      botSenderEmail,
      aiWebhookUrl: aiWebhookUrl || null,
      webhookUrl,
      channels,
    };

    if (row) {
      await updateMarketplaceMetadata(tenantId, (current) => ({
        status: 'connected',
        isActive: true,
        metadata: {
          ...current.metadata,
          healthScore: channels.length > 0 ? 96 : 88,
          lastError: null,
          detectedChannels: channels,
          lastConnectionProbeAt: checkedAt,
        },
        lastSyncAt: new Date(),
      }));
    }

    return status;
  } catch (error) {
    return {
      configured: true,
      active: Boolean(row?.is_active),
      hasAppId: true,
      hasSecretKey: true,
      hasBotSenderEmail: true,
      hasAiWebhook: Boolean(aiWebhookUrl),
      reachable: false,
      checkedAt,
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Marketplace chat engine tidak merespons.',
      workspaceName,
      appIdMasked: maskReference(appId),
      botSenderEmail,
      aiWebhookUrl: aiWebhookUrl || null,
      webhookUrl,
      channels: [],
    };
  }
}

function getRoomId(payload: JsonRecord): string | null {
  return String(
    payload.room_id
    || asRecord(payload.payload).room_id
    || asRecord(asRecord(payload.payload).room).id
    || asRecord(payload.room).id
    || ''
  ).trim() || null;
}

function getIncomingMessage(payload: JsonRecord) {
  const rootPayload = asRecord(payload.payload);
  const message = asRecord(rootPayload.message);
  const from = asRecord(rootPayload.from);
  const channel = asRecord(payload.channel || rootPayload.channel);
  const room = asRecord(rootPayload.room || payload.room);

  return {
    rawType: String(payload.type || payload.event_type || '').trim(),
    appCode: String(payload.app_code || payload.app_id || '').trim(),
    roomId: getRoomId(payload),
    customer: {
      id: String(from.id || from.id_str || '').trim() || null,
      email: String(from.email || '').trim() || null,
      name: String(from.name || '').trim() || null,
      avatarUrl: String(from.avatar_url || '').trim() || null,
    },
    channel: {
      id: String(channel.id || '').trim() || null,
      name: String(channel.name || '').trim() || null,
      source: String(channel.source || room.source || '').trim() || null,
    },
    message: {
      id: String(message.id || message.id_str || '').trim() || null,
      type: String(message.type || 'text').trim(),
      text: String(message.text || '').trim(),
      createdAt: String(message.created_at || '').trim() || null,
      payload: message.payload ?? null,
      extras: message.extras ?? null,
    },
    room: room,
    raw: payload,
  };
}

async function triggerAiWebhook(config: {
  tenantId: number;
  appId: string;
  secretKey: string;
  senderEmail: string;
  aiWebhookUrl: string;
  aiWebhookAuthToken?: string | null;
  aiWebhookTimeoutMs?: number | null;
  aiSystemMessage?: string | null;
  event: ReturnType<typeof getIncomingMessage>;
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-MyCommerSocial-Source': 'marketplace-hub',
    'X-MyCommerSocial-Tenant': String(config.tenantId),
  };

  if (config.aiWebhookAuthToken) {
    headers.Authorization = `Bearer ${config.aiWebhookAuthToken}`;
  }

  const response = await fetch(config.aiWebhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: 'jubelio_marketplace',
      tenantId: config.tenantId,
      appId: config.appId,
      senderEmail: config.senderEmail,
      roomId: config.event.roomId,
      customer: config.event.customer,
      channel: config.event.channel,
      message: config.event.message,
      room: config.event.room,
      raw: config.event.raw,
      ...(config.aiSystemMessage ? { systemMessage: config.aiSystemMessage } : {}),
    }),
    signal: AbortSignal.timeout(config.aiWebhookTimeoutMs || 15000),
  });

  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(`AI webhook returned ${response.status}`);
  }

  return responseBody;
}

function normalizeAiResult(raw: unknown) {
  if (typeof raw === 'string') {
    return {
      messages: raw.trim() ? [{ type: 'text', message: raw.trim(), payload: null }] : [],
      handover: false,
      handoverRole: null as string | null,
      roles: [] as string[],
      findOnlineAgent: false,
    };
  }

  const record = asRecord(raw);
  const messages = Array.isArray(record.messages)
    ? record.messages.map((item) => {
        const message = asRecord(item);
        return {
          type: String(message.type || 'text'),
          message: String(message.message || message.text || '').trim(),
          payload: message.payload ? asRecord(message.payload) : null,
        };
      }).filter((item) => item.message)
    : String(record.reply || record.message || '').trim()
      ? [{ type: 'text', message: String(record.reply || record.message).trim(), payload: null }]
      : [];

  return {
    messages,
    handover: Boolean(record.handover),
    handoverRole: typeof record.handoverRole === 'string' ? record.handoverRole : typeof record.role === 'string' ? record.role : null,
    roles: Array.isArray(record.roles) ? record.roles.map(String).filter(Boolean) : [],
    findOnlineAgent: Boolean(record.findOnlineAgent),
  };
}

export async function handleMarketplaceHubWebhook(input: {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: MarketplaceWebhookContext;
}) {
  const tenantId = Number(input.query.tenantId);
  const token = String(input.query.token || '');

  if (!tenantId || !token) {
    const error = new Error('Missing tenant or token in webhook URL');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: 'managed_marketplace_hub',
      },
    },
    select: {
      configuration: true,
      credentials: true,
      metadata: true,
      status: true,
      is_active: true,
    },
  });

  if (!row) {
    const error = new Error('Marketplace integration not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const configuration = asRecord(row.configuration);
  const credentials = decryptCredentials(row.credentials);

  if (String(configuration.webhookToken || '') !== token) {
    const error = new Error('Invalid marketplace webhook token');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const event = getIncomingMessage(asRecord(input.body));
  const appId = String(credentials.appId || credentials.connectionId || '').trim();
  const secretKey = String(credentials.secretKey || '').trim();
  const botSenderEmail = String(credentials.botSenderEmail || '').trim();
  const aiWebhookUrl = String(configuration.aiWebhookUrl || '').trim();
  const aiWebhookAuthToken = String(credentials.aiWebhookAuthToken || '').trim() || null;
  const aiWebhookTimeoutMs = Number(configuration.aiWebhookTimeoutMs || 15000);
  const aiSystemMessage = String(configuration.aiSystemMessage || '').trim() || null;

  if (event.appCode && appId && event.appCode !== appId) {
    const error = new Error('Webhook app code does not match stored marketplace app id');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  if (!verifyJubelioWebhookSignature(input.body, input.headers, secretKey)) {
    const error = new Error('Invalid marketplace webhook signature');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  await updateMarketplaceMetadata(tenantId, (current) => ({
    status: current.status === 'inactive' ? 'connected' : current.status,
    isActive: true,
    metadata: {
      ...current.metadata,
      lastWebhookEvent: {
        receivedAt: new Date().toISOString(),
        eventType: event.rawType || 'bot_webhook',
        channel: event.channel.source,
        customer: event.customer.name || event.customer.email,
        text: event.message.text,
      },
      lastError: null,
      healthScore: 96,
    },
    lastSyncAt: new Date(),
  }));

  const isLoopback = event.rawType === 'post_comment_rest'
    || (event.customer.email && botSenderEmail && event.customer.email.toLowerCase() === botSenderEmail.toLowerCase());

  if (isLoopback || !event.roomId || !appId || !secretKey || !botSenderEmail || !aiWebhookUrl) {
    return {
      accepted: true,
      aiTriggered: false,
      ignored: isLoopback,
      reason: isLoopback
        ? 'Loopback message ignored'
        : !aiWebhookUrl
          ? 'AI webhook is not configured'
          : !event.roomId
            ? 'room_id missing'
            : 'Marketplace credentials incomplete',
    };
  }

  const aiRaw = await triggerAiWebhook({
    tenantId,
    appId,
    secretKey,
    senderEmail: botSenderEmail,
    aiWebhookUrl,
    aiWebhookAuthToken,
    aiWebhookTimeoutMs,
    aiSystemMessage,
    event,
  });

  const aiResult = normalizeAiResult(aiRaw);

  for (const item of aiResult.messages) {
    await sendJubelioBotMessage({
      appId,
      secretKey,
      senderEmail: botSenderEmail,
      roomId: event.roomId,
      message: item.message,
      type: item.type,
    });
  }

  if (aiResult.handover || aiResult.handoverRole || aiResult.roles.length > 0) {
    await handOverJubelioRoom({
      appId,
      secretKey,
      roomId: event.roomId,
      role: aiResult.handoverRole,
    });
  }

  await updateMarketplaceMetadata(tenantId, (current) => ({
    metadata: {
      ...current.metadata,
      lastAiExecutionAt: new Date().toISOString(),
      lastAiReplyPreview: aiResult.messages[0]?.message || null,
      lastError: null,
    },
    lastSyncAt: new Date(),
  }));

  return {
    accepted: true,
    aiTriggered: true,
    sentMessages: aiResult.messages.length,
    handedOver: Boolean(aiResult.handover || aiResult.handoverRole || aiResult.roles.length > 0),
  };
}
