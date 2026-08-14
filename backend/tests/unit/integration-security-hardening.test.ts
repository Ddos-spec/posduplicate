import { createHmac } from 'crypto';
import {
  checkJubelioConnectionStatus,
  verifyJubelioWebhookSignature,
} from '../../src/modules/medsos/services/jubelioMarketplace.service';
import {
  validateOutboundWebhookTarget,
  verifyZernioWebhookSignature as verifyZernioSignature,
} from '../../src/modules/medsos/services/zernioWebhookSecurity.service';

describe('integration security hardening', () => {
  test('Zernio accepts only an exact raw-body HMAC and fails closed', () => {
    const rawBody = Buffer.from(JSON.stringify({ id: 'event-1', event: 'webhook.test' }));
    const secret = 'unit-test-zernio-secret';
    const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('0') ? '1' : '0'}`;

    expect(verifyZernioSignature({ rawBody, secret, signature })).toEqual({ valid: true });
    expect(verifyZernioSignature({ rawBody, secret, signature: tamperedSignature })).toEqual({
      valid: false,
      reason: 'signature_invalid',
    });
    expect(verifyZernioSignature({ rawBody, secret })).toEqual({ valid: false, reason: 'signature_missing' });
    expect(verifyZernioSignature({ rawBody, signature })).toEqual({ valid: false, reason: 'secret_not_configured' });
    expect(verifyZernioSignature({ secret, signature })).toEqual({ valid: false, reason: 'raw_body_missing' });
  });

  test('Jubelio webhook validation never accepts a missing secret or signature', () => {
    const payload = { event: 'message.received' };
    const secret = 'unit-test-jubelio-secret';
    const signature = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    expect(verifyJubelioWebhookSignature(payload, {}, '')).toBe(false);
    expect(verifyJubelioWebhookSignature(payload, {}, secret)).toBe(false);
    expect(verifyJubelioWebhookSignature(payload, { 'x-jubelio-signature': signature }, secret)).toBe(true);
    expect(verifyJubelioWebhookSignature({ event: 'tampered' }, { 'x-jubelio-signature': signature }, secret)).toBe(false);
  });

  test('production webhook forwarding is HTTPS and exact-host allowlist only', () => {
    expect(validateOutboundWebhookTarget({
      target: 'https://hooks.example.com/events#fragment',
      allowedHosts: 'hooks.example.com',
      nodeEnv: 'production',
    })).toEqual({ valid: true, url: 'https://hooks.example.com/events' });
    expect(validateOutboundWebhookTarget({
      target: 'http://hooks.example.com/events',
      allowedHosts: 'hooks.example.com',
      nodeEnv: 'production',
    })).toEqual({ valid: false, reason: 'https_required' });
    expect(validateOutboundWebhookTarget({
      target: 'https://127.0.0.1/internal',
      allowedHosts: 'hooks.example.com',
      nodeEnv: 'production',
    })).toEqual({ valid: false, reason: 'host_not_allowed' });
    expect(validateOutboundWebhookTarget({
      target: 'https://user:password@hooks.example.com/events',
      allowedHosts: 'hooks.example.com',
      nodeEnv: 'production',
    })).toEqual({ valid: false, reason: 'credentials_forbidden' });
  });

  test('Jubelio credentials are not misreported as a reachable connection', async () => {
    await expect(checkJubelioConnectionStatus({ appId: 'configured', secretKey: 'configured' })).resolves.toMatchObject({
      reachable: false,
      channels: [],
    });
  });
});
