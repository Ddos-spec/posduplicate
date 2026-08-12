import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P1-B manufacturing, quality and maintenance invariants', () => {
  test('manufacturing completion serializes tenant stock mutations and uses atomic material decrements', () => {
    const source = read('src/modules/fnb/controllers/manufacturing.p1.controller.ts');

    expect(source).toContain('pg_advisory_xact_lock');
    expect(source).toContain('73001');
    expect(source).toContain('FOR UPDATE');
    expect(source).toContain('SET stock = COALESCE(stock, 0) -');
    expect(source).toContain('COALESCE(stock, 0) >=');
    expect(source).toContain('SET current_stock = current_stock -');
    expect(source).toContain('current_stock >=');
    expect(source).toContain("code: 'INSUFFICIENT_MATERIAL'");
    expect(source).toContain("code: 'MATERIAL_CONSUMPTION_INVALID'");
    expect(source).toContain("code: 'MATERIAL_SOURCE_MISSING'");
  });

  test('finished goods posting is atomic and production costing is based on the MO snapshot', () => {
    const source = read('src/modules/fnb/controllers/manufacturing.p1.controller.ts');

    expect(source).toContain('SET stock = COALESCE(stock, 0) +');
    expect(source).toContain('planned_material_cost');
    expect(source).toContain('consumed_material_cost');
    expect(source).toContain('yield_percentage');
    expect(source).toContain('output_unit_cost');
    expect(source).toContain('Number(consumption.unit_cost || ingredient.cost_per_unit || 0)');
    expect(source).toContain('Number(consumption.unit_cost || inv.cost_amount || 0)');
    expect(source).toContain('unit_price: outputUnitCost');
    expect(source).toContain('total_cost: materialCost');
  });

  test('legacy POS ingredient deduction is also atomic rather than stale read-write', () => {
    const source = read('src/modules/fnb/controllers/transaction.controller.ts');
    expect(source).toContain('decrement:');
  });

  test('quality checks validate production references and resolve once under row lock', () => {
    const source = read('src/modules/fnb/controllers/quality-maintenance.p1.controller.ts');

    expect(source).toContain("code: 'PRODUCTION_QC_REFERENCE_REQUIRED'");
    expect(source).toContain("code: 'QC_ALREADY_PENDING'");
    expect(source).toContain("code: 'QC_REFERENCE_MISMATCH'");
    expect(source).toContain("code: 'QC_REASON_REQUIRED'");
    expect(source).toContain("code: 'QC_ALREADY_RESOLVED'");
    expect(source).toMatch(/quality_checks[^;]*FOR UPDATE/s);
  });

  test('maintenance lifecycle is transactional and terminal states cannot reopen', () => {
    const source = read('src/modules/fnb/controllers/quality-maintenance.p1.controller.ts');

    expect(source).toContain("open: ['planned', 'in_progress', 'done', 'cancelled']");
    expect(source).toContain("planned: ['in_progress', 'done', 'cancelled']");
    expect(source).toContain("in_progress: ['done', 'cancelled']");
    expect(source).toContain('done: []');
    expect(source).toContain('cancelled: []');
    expect(source).toContain("code: 'INVALID_MAINTENANCE_TRANSITION'");
    expect(source).toContain('active_count');
    expect(source).toContain('critical_count');
    expect(source).toContain("priority === 'critical'");
    expect(source).toMatch(/maintenance_equipment[\s\S]*FOR UPDATE/);
  });
});
