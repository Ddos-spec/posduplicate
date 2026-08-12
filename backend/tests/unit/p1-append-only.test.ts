import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P1 immutable audit guards', () => {
  test('append-only guard migration protects every P1 operational ledger', () => {
    const migration = read('prisma/migrations/20260812140000_p1_append_only_guards/migration.sql');

    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(migration).toContain('trg_loyalty_ledger_append_only');
    expect(migration).toContain('trg_warehouse_stock_ledger_append_only');
    expect(migration).toContain('trg_procurement_event_ledger_append_only');
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.loyalty_ledger/);
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.warehouse_stock_ledger/);
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.procurement_event_ledger/);
    expect(migration).toContain("ERRCODE = '55000'");
  });

  test('production migration runner includes immutable guard as a forward migration', () => {
    const runner = read('src/scripts/apply-p1-migrations.ts');
    expect(runner).toContain("'20260812140000_p1_append_only_guards'");
    expect(runner).toContain('checksum_sha256');
    expect(runner).toContain('Never edit an applied P1 migration');
  });

  test('Suite CI validates four P1 migrations and immutable trigger presence', () => {
    const workflow = read('../.github/workflows/frontend-ci.yml');
    expect(workflow).toContain('ledger.rows.length !== 4');
    expect(workflow).toContain('trg_loyalty_ledger_append_only');
    expect(workflow).toContain('trg_warehouse_stock_ledger_append_only');
    expect(workflow).toContain('trg_procurement_event_ledger_append_only');
    expect(workflow).toContain('Production backend Docker image build gate');
  });
});
