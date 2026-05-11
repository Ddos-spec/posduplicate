import { createHmac, timingSafeEqual } from 'crypto';

// Jubelio Marketplace Chat Service
// TODO: fill in actual endpoints when Jubelio API docs confirmed

type JsonRecord = Record<string, any>;

function getJubelioBaseUrl(): string {
  return (process.env.MCS_MARKETPLACE_JUBELIO_BASE_URL || 'https://api.jubelio.com').replace(/\/$/, '');
}

export function verifyJubelioWebhookSignature(
  payload: unknown,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  if (!secret) return true;
  // TODO: confirm exact header name from Jubelio docs
  const raw = headers['x-jubelio-signature'] || headers['jubelio-signature'] || '';
  const provided = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!provided) return true;
  const plainText = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  const expected = createHmac('sha256', secret).update(plainText).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
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

  try {
    // TODO: replace with real Jubelio health/channel endpoint when confirmed
    // const response = await fetch(`${getJubelioBaseUrl()}/v1/channels`, {
    //   headers: { 'X-Auth-App-ID': appId, 'X-Auth-Secret-Key': secretKey },
    //   signal: AbortSignal.timeout(8000),
    // });
    // if (!response.ok) throw new Error(`Jubelio returned ${response.status}`);
    return {
      reachable: true,
      channels: [],
      message: 'Jubelio dikonfigurasi — endpoint health check menyusul setelah API docs dikonfirmasi.',
    };
  } catch (error) {
    return {
      reachable: false,
      channels: [],
      message: error instanceof Error ? error.message : 'Jubelio tidak merespons.',
    };
  }
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
