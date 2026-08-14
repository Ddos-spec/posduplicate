import { createHmac, timingSafeEqual } from 'crypto';

// Jubelio Marketplace Chat remains fail-closed until the provider publishes a
// confirmed health, webhook-signature, send-message, and handover contract.

type JsonRecord = Record<string, any>;

function getJubelioBaseUrl(): string {
  return (process.env.MCS_MARKETPLACE_JUBELIO_BASE_URL || 'https://api.jubelio.com').replace(/\/$/, '');
}

export function verifyJubelioWebhookSignature(
  payload: unknown,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  if (!secret) return false;
  const raw = headers['x-jubelio-signature'] || headers['jubelio-signature'] || '';
  const provided = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  const plainText = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  const expected = createHmac('sha256', secret).update(plainText).digest();
  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), expected);
  } catch {
    return false;
  }
}

export async function checkJubelioConnectionStatus(
  credentials: JsonRecord,
): Promise<{ reachable: boolean; channels: any[]; message: string }> {
  const appId = String(credentials.appId || credentials.connectionId || '').trim();
  const secretKey = String(credentials.secretKey || '').trim();

  if (!appId || !secretKey) {
    return { reachable: false, channels: [], message: 'Kredensial Jubelio belum dikonfigurasi.' };
  }

  return {
    reachable: false,
    channels: [],
    message: 'Kredensial tersimpan, tetapi koneksi tidak diklaim aktif karena kontrak API Jubelio belum terverifikasi.',
  };
}

export async function sendJubelioBotMessage(_input: {
  appId: string;
  secretKey: string;
  senderEmail: string;
  roomId: string;
  message: string;
  type?: string;
}): Promise<void> {
  // TODO: implement when Jubelio send message endpoint confirmed
  // POST ${getJubelioBaseUrl()}/v1/chat/send
  void getJubelioBaseUrl();
  throw new Error('Jubelio sendBotMessage: menunggu konfirmasi API docs');
}

export async function handOverJubelioRoom(_input: {
  appId: string;
  secretKey: string;
  roomId: string;
  role?: string | null;
}): Promise<void> {
  // TODO: implement when Jubelio handover endpoint confirmed
  // POST ${getJubelioBaseUrl()}/v1/chat/handover
  void getJubelioBaseUrl();
  throw new Error('Jubelio handOverRoom: menunggu konfirmasi API docs');
}
