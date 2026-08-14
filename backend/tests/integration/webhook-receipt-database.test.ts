import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('generic webhook receipt database governance', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  test('migration ledger and unique signed evidence are durable', async () => {
    const ledger = await client.query<{ migration_name: string }>(`
      SELECT migration_name FROM public.suite_schema_migrations
      WHERE migration_name IN (
        '20260728135000_add_webhook_events',
        '20260815090000_harden_webhook_events'
      )
      ORDER BY migration_name
    `);
    expect(ledger.rows.map((row) => row.migration_name)).toEqual([
      '20260728135000_add_webhook_events',
      '20260815090000_harden_webhook_events',
    ]);

    const key = `webhook-governance-${Date.now()}-${Math.random()}`;
    await client.query('BEGIN');
    try {
      await client.query(`
        INSERT INTO public.webhook_events
          (idempotency_key,integration_type,tenant_id,external_id,payload_digest,expires_at)
        VALUES ($1,'gofood',999001,'ORDER-1',$2,NOW() + INTERVAL '5 minutes')
      `, [key, 'a'.repeat(64)]);

      await client.query('SAVEPOINT duplicate_receipt');
      await expect(client.query(`
        INSERT INTO public.webhook_events
          (idempotency_key,integration_type,tenant_id,external_id,payload_digest,expires_at)
        VALUES ($1,'gofood',999001,'ORDER-1',$2,NOW() + INTERVAL '5 minutes')
      `, [key, 'b'.repeat(64)])).rejects.toMatchObject({ code: '23505' });
      await client.query('ROLLBACK TO SAVEPOINT duplicate_receipt');
      await client.query('RELEASE SAVEPOINT duplicate_receipt');

      const receipt = await client.query<{ payload_digest: string }>(
        'SELECT payload_digest FROM public.webhook_events WHERE idempotency_key=$1',
        [key],
      );
      expect(receipt.rows[0]?.payload_digest).toBe('a'.repeat(64));
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
