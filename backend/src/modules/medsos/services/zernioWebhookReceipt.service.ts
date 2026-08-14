import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

type ReceiptRow = {
  event_id: string;
  event_type: string;
  payload_hash: string;
  status: 'processing' | 'processed' | 'failed';
  attempt_count: number;
};

export type ZernioWebhookReceiptResult =
  | { outcome: 'processed' | 'duplicate'; attemptCount: number }
  | { outcome: 'conflict'; attemptCount: number }
  | { outcome: 'failed'; attemptCount: number; errorCode: string };

export class ZernioWebhookProcessingError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'ZernioWebhookProcessingError';
  }
}

const safeErrorCode = (error: unknown): string => {
  if (error instanceof ZernioWebhookProcessingError && /^[A-Z0-9_]{1,100}$/.test(error.code)) {
    return error.code;
  }
  return 'PROCESSING_FAILED';
};

/**
 * Serializes each provider event with a transaction-scoped advisory lock.
 * A duplicate waits for the first delivery to commit, then observes `processed` and skips
 * side effects. A failed delivery remains retryable and records only a safe error code.
 */
export const processZernioWebhookReceipt = async (
  input: { eventId: string; eventType: string; payloadHash: string },
  processEvent: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<ZernioWebhookReceiptResult> => prisma.$transaction(async (tx) => {
  await tx.$queryRaw<Array<{ locked: number }>>(Prisma.sql`
    SELECT 1 AS locked
    FROM (SELECT pg_advisory_xact_lock(hashtextextended(${input.eventId}, 0))) AS advisory_lock
  `);

  const existingRows = await tx.$queryRaw<ReceiptRow[]>(Prisma.sql`
    SELECT event_id,event_type,payload_hash,status,attempt_count
    FROM public.zernio_webhook_receipts
    WHERE event_id=${input.eventId}
    FOR UPDATE
  `);
  const existing = existingRows[0];

  if (existing && (existing.payload_hash !== input.payloadHash || existing.event_type !== input.eventType)) {
    return { outcome: 'conflict', attemptCount: existing.attempt_count };
  }

  if (existing?.status === 'processed') {
    const updated = await tx.$queryRaw<Array<{ attempt_count: number }>>(Prisma.sql`
      UPDATE public.zernio_webhook_receipts
      SET attempt_count=attempt_count+1,last_received_at=NOW()
      WHERE event_id=${input.eventId}
      RETURNING attempt_count
    `);
    return { outcome: 'duplicate', attemptCount: updated[0].attempt_count };
  }

  let attemptCount = 1;
  if (existing) {
    const updated = await tx.$queryRaw<Array<{ attempt_count: number }>>(Prisma.sql`
      UPDATE public.zernio_webhook_receipts
      SET status='processing',attempt_count=attempt_count+1,last_received_at=NOW(),
          processed_at=NULL,last_error_code=NULL
      WHERE event_id=${input.eventId}
      RETURNING attempt_count
    `);
    attemptCount = updated[0].attempt_count;
  } else {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.zernio_webhook_receipts
        (event_id,event_type,payload_hash,status,attempt_count)
      VALUES (${input.eventId},${input.eventType},${input.payloadHash},'processing',1)
    `);
  }

  try {
    await processEvent(tx);
  } catch (error) {
    const errorCode = safeErrorCode(error);
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.zernio_webhook_receipts
      SET status='failed',last_error_code=${errorCode},processed_at=NULL
      WHERE event_id=${input.eventId}
    `);
    return { outcome: 'failed', attemptCount, errorCode };
  }

  await tx.$executeRaw(Prisma.sql`
    UPDATE public.zernio_webhook_receipts
    SET status='processed',processed_at=NOW(),last_error_code=NULL
    WHERE event_id=${input.eventId}
  `);
  return { outcome: 'processed', attemptCount };
}, { maxWait: 5_000, timeout: 15_000 });
