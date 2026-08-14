import crypto from 'crypto';
import prisma from '../../src/utils/prisma';
import {
  releaseWebhookEvent,
  resolveWebhookIntegration,
  validateWebhookPayload,
  webhookIdempotency,
} from '../../src/middlewares/webhook.middleware';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    integrations: { findMany: jest.fn() },
    outlets: { findFirst: jest.fn() },
    webhook_events: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('generic webhook hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.webhook_events.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.webhook_events.create as jest.Mock).mockResolvedValue({ id: 1 });
  });

  test('rejects a malformed integration selector before database resolution', async () => {
    const req = {
      header: jest.fn().mockReturnValue('not-an-id'),
      query: {},
      body: {},
    } as any;
    const res = response() as any;
    const next = jest.fn();

    await resolveWebhookIntegration('gofood')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.integrations.findMany).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('requires an explicit selector when multiple tenants configured a provider', async () => {
    const req = { header: jest.fn(), query: {}, body: {} } as any;
    const res = response() as any;
    const next = jest.fn();
    (prisma.integrations.findMany as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await resolveWebhookIntegration('gofood')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an identity reused with different signed payload evidence', async () => {
    const body = { orderId: 'ORDER-1', status: 'new', totalAmount: 1000 };
    const rawBody = Buffer.from(JSON.stringify(body));
    const req = {
      body,
      rawBody,
      integrationTenantId: 7,
      webhookIntegration: { id: 12 },
    } as any;
    const res = response() as any;
    const next = jest.fn();
    (prisma.webhook_events.findUnique as jest.Mock).mockResolvedValue({
      event_status: 'completed',
      payload_digest: '0'.repeat(64),
      response_payload: { success: true },
    });

    await webhookIdempotency('gofood')(req, res, next);

    expect(crypto.createHash('sha256').update(rawBody).digest('hex')).not.toBe('0'.repeat(64));
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.webhook_events.create).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('persists tenant, integration, and payload evidence before processing', async () => {
    const body = { orderId: 'ORDER-2', status: 'accepted', totalAmount: 2500 };
    const rawBody = Buffer.from(JSON.stringify(body));
    const req = {
      body,
      rawBody,
      integrationTenantId: 7,
      webhookIntegration: { id: 12 },
    } as any;
    const res = response() as any;
    const next = jest.fn();
    (prisma.webhook_events.findUnique as jest.Mock).mockResolvedValue(null);

    await webhookIdempotency('gofood')(req, res, next);

    expect(prisma.webhook_events.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotency_key: 'gofood-12-7-ORDER-2-accepted',
        integration_type: 'gofood',
        tenant_id: 7,
        external_id: 'ORDER-2',
        payload_digest: crypto.createHash('sha256').update(rawBody).digest('hex'),
      }),
    });
    expect(req.idempotencyKey).toBe('gofood-12-7-ORDER-2-accepted');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('validates delivery identity before an idempotency receipt can be created', () => {
    const req = { body: { status: 'made-up', totalAmount: -1 } } as any;
    const res = response() as any;
    const next = jest.fn();

    validateWebhookPayload('grabfood')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects unmappable or invalid delivery line evidence', () => {
    const req = {
      body: {
        orderId: 'ORDER-3',
        status: 'new',
        totalAmount: 1000,
        items: [{ quantity: 0, price: -1 }],
      },
    } as any;
    const res = response() as any;
    const next = jest.fn();

    validateWebhookPayload('gofood')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('releases only unfinished receipts', async () => {
    await releaseWebhookEvent('gofood-12-7-ORDER-2-accepted');

    expect(prisma.webhook_events.deleteMany).toHaveBeenCalledWith({
      where: {
        idempotency_key: 'gofood-12-7-ORDER-2-accepted',
        event_status: 'processing',
      },
    });
  });
});
