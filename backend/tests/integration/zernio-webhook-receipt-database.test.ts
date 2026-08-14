import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('Zernio webhook receipt database governance', () => {
  let client: Client;
  let migrationApplied = false;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    const ledger = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM public.p3_schema_migrations
      WHERE migration_name='20260814133000_zernio_webhook_receipts'
    `).catch(() => ({ rows: [{ count: '0' }] }));
    migrationApplied = ledger.rows[0]?.count === '1';
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  test('receipt evidence is immutable while retry state remains updateable', async () => {
    if (!migrationApplied) return;

    const eventId = `zernio-governance-${Date.now()}-${Math.random()}`;
    const hash = 'a'.repeat(64);
    await client.query('BEGIN');
    try {
      await client.query(`
        INSERT INTO public.zernio_webhook_receipts
          (event_id,event_type,payload_hash,status,attempt_count)
        VALUES ($1,'webhook.test',$2,'processing',1)
      `, [eventId, hash]);
      await client.query(`
        UPDATE public.zernio_webhook_receipts
        SET status='failed',attempt_count=2,last_received_at=NOW(),last_error_code='TEST_FAILURE'
        WHERE event_id=$1
      `, [eventId]);

      await client.query('SAVEPOINT immutable_evidence');
      await expect(client.query(`
        UPDATE public.zernio_webhook_receipts SET payload_hash=$2 WHERE event_id=$1
      `, [eventId, 'b'.repeat(64)])).rejects.toMatchObject({ code: 'P0001' });
      await client.query('ROLLBACK TO SAVEPOINT immutable_evidence');
      await client.query('RELEASE SAVEPOINT immutable_evidence');

      await client.query('SAVEPOINT append_only_receipt');
      await expect(client.query(
        'DELETE FROM public.zernio_webhook_receipts WHERE event_id=$1',
        [eventId],
      )).rejects.toMatchObject({ code: 'P0001' });
      await client.query('ROLLBACK TO SAVEPOINT append_only_receipt');
      await client.query('RELEASE SAVEPOINT append_only_receipt');

      const state = await client.query<{ status: string; attempt_count: number; last_error_code: string }>(`
        SELECT status,attempt_count,last_error_code
        FROM public.zernio_webhook_receipts WHERE event_id=$1
      `, [eventId]);
      expect(state.rows[0]).toEqual({
        status: 'failed',
        attempt_count: 2,
        last_error_code: 'TEST_FAILURE',
      });
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
