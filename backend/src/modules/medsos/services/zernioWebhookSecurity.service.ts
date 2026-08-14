import { createHmac, timingSafeEqual } from 'crypto';

export type ZernioSignatureFailure =
  | 'secret_not_configured'
  | 'signature_missing'
  | 'signature_invalid'
  | 'raw_body_missing';

export type ZernioSignatureResult =
  | { valid: true }
  | { valid: false; reason: ZernioSignatureFailure };

export type OutboundWebhookTargetResult =
  | { valid: true; url: string }
  | { valid: false; reason: 'url_invalid' | 'credentials_forbidden' | 'https_required' | 'host_not_allowed' };

/**
 * Zernio signs the exact raw request bytes using lowercase-hex HMAC-SHA256.
 * Keep this pure so the fail-closed behavior is independently testable.
 */
export const verifyZernioWebhookSignature = (input: {
  rawBody?: Buffer;
  signature?: string;
  secret?: string;
}): ZernioSignatureResult => {
  const secret = input.secret?.trim();
  if (!secret) return { valid: false, reason: 'secret_not_configured' };
  if (!input.rawBody) return { valid: false, reason: 'raw_body_missing' };

  const signature = input.signature?.trim();
  if (!signature) return { valid: false, reason: 'signature_missing' };
  if (!/^[a-f0-9]{64}$/.test(signature)) return { valid: false, reason: 'signature_invalid' };

  const expected = createHmac('sha256', secret).update(input.rawBody).digest();
  const provided = Buffer.from(signature, 'hex');
  return timingSafeEqual(provided, expected)
    ? { valid: true }
    : { valid: false, reason: 'signature_invalid' };
};

/**
 * Production forwarding is deliberately allowlist-only to prevent a tenant-controlled
 * webhook URL from becoming an SSRF primitive. Development may use loopback HTTP.
 */
export const validateOutboundWebhookTarget = (input: {
  target: unknown;
  allowedHosts?: string;
  nodeEnv?: string;
}): OutboundWebhookTargetResult => {
  if (typeof input.target !== 'string' || !input.target.trim()) {
    return { valid: false, reason: 'url_invalid' };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.target.trim());
  } catch {
    return { valid: false, reason: 'url_invalid' };
  }
  if (parsed.username || parsed.password) return { valid: false, reason: 'credentials_forbidden' };

  const hostname = parsed.hostname.toLowerCase();
  const loopbackDevelopment = input.nodeEnv !== 'production'
    && parsed.protocol === 'http:'
    && ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (parsed.protocol !== 'https:' && !loopbackDevelopment) {
    return { valid: false, reason: 'https_required' };
  }

  const allowedHosts = new Set((input.allowedHosts || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean));
  if (input.nodeEnv === 'production' && !allowedHosts.has(hostname)) {
    return { valid: false, reason: 'host_not_allowed' };
  }

  parsed.hash = '';
  return { valid: true, url: parsed.toString() };
};
