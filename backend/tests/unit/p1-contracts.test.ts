import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('business-suite contracts', () => {
  test('revenue and supply-chain route surfaces are tenant gated and capability protected', () => {
    const revenueRoutes = read('src/modules/fnb/routes/revenue.routes.ts');
    const supplyRoutes = read('src/modules/fnb/routes/supply-chain.routes.ts');
    const purchaseRoutes = read('src/modules/fnb/routes/purchase-orders.routes.ts');
    const recipeRoutes = read('src/modules/fnb/routes/recipe.routes.ts');
    const supplierRoutes = read('src/modules/fnb/routes/supplier.routes.ts');
    for (const source of [revenueRoutes, supplyRoutes, purchaseRoutes, recipeRoutes, supplierRoutes]) {
      expect(source).toContain('authMiddleware'); expect(source).toContain('tenantMiddleware'); expect(source).toMatch(/router\.use\(authMiddleware, tenantMiddleware\)/); expect(source).toContain('requireCapability');
    }
    expect(revenueRoutes).toContain("requireCapability('revenue.sales.manage')");
    expect(supplyRoutes).toContain("requireCapability('supply.warehouse.manage')");
    expect(purchaseRoutes).toContain("requireCapability('supply.procurement.manage')");
    expect(supplierRoutes).toContain("router.get('/', requireCapability('supply.procurement.read'), getSuppliers)");
    expect(supplierRoutes).not.toContain('ownerOnly');
    expect(recipeRoutes).toContain("requireCapability('supply.manufacturing.read')");
    expect(recipeRoutes).toContain("requireCapability('supply.manufacturing.manage')");
    expect(recipeRoutes).not.toContain('ownerOnly');
  });

  test('workforce and payroll routes use tenant context and named capabilities', () => {
    const workforceRoutes = read('src/modules/fnb/routes/workforce.routes.ts');
    const payrollRoutes = read('src/modules/accounting/routes/accounting.payroll.routes.ts');
    expect(workforceRoutes).toContain('authMiddleware');
    expect(workforceRoutes).toContain('tenantMiddleware');
    expect(workforceRoutes).toContain("requireCapability('workforce.employee.read')");
    expect(workforceRoutes).toContain("requireCapability('workforce.attendance.read')");
    expect(workforceRoutes).toContain("requireCapability('workforce.attendance.self')");
    expect(workforceRoutes).toContain("requireCapability('workforce.leave.read')");
    expect(workforceRoutes).toContain("requireCapability('workforce.leave.manage')");
    expect(workforceRoutes).toContain("requireCapability('workforce.leave.self')");
    expect(workforceRoutes).toContain("requireCapability('workforce.recruitment.read')");
    expect(workforceRoutes).toContain("requireCapability('workforce.recruitment.manage')");
    expect(payrollRoutes).toContain("requireCapability('workforce.employee.manage')");
    expect(payrollRoutes).toContain("requireCapability('workforce.payroll.read')");
    expect(payrollRoutes).toContain("requireCapability('workforce.payroll.manage')");
  });

  test('PO receiving uses the warehouse-aware atomic receiving path', () => {
    const purchaseRoutes = read('src/modules/fnb/routes/purchase-orders.routes.ts');
    const receiving = read('src/modules/fnb/controllers/procurement-receiving.p1.controller.ts');
    expect(purchaseRoutes).toContain('receivePOItemsWithWarehouse');
    expect(purchaseRoutes).toContain("requireCapability('supply.procurement.manage')");
    expect(receiving).toContain("'receipt'");
    expect(receiving).toContain('warehouse_stock_ledger');
    expect(receiving).toContain('warehouse_stock_balances');
    expect(receiving).toContain('stock_movements.create');
    expect(receiving).toContain('inventory.update');
  });

  test('loyalty and warehouse ledgers remain append-only in P1 controllers', () => {
    const revenue = read('src/modules/fnb/controllers/revenue.controller.ts');
    const warehouse = read('src/modules/fnb/controllers/warehouse.p1.controller.ts');
    const receiving = read('src/modules/fnb/controllers/procurement-receiving.p1.controller.ts');
    expect(revenue).toContain('INSERT INTO public.loyalty_ledger');
    expect(revenue).not.toMatch(/UPDATE\s+public\.loyalty_ledger/i);
    expect(revenue).not.toMatch(/DELETE\s+FROM\s+public\.loyalty_ledger/i);
    for (const source of [warehouse, receiving]) {
      expect(source).toContain('INSERT INTO public.warehouse_stock_ledger');
      expect(source).not.toMatch(/UPDATE\s+public\.warehouse_stock_ledger/i);
      expect(source).not.toMatch(/DELETE\s+FROM\s+public\.warehouse_stock_ledger/i);
    }
  });

  test('CRM stage transitions apply deterministic default probabilities', () => {
    const revenue = read('src/modules/fnb/controllers/revenue.controller.ts');
    for (const [stage, probability] of Object.entries({ new: 10, qualified: 30, proposal: 50, negotiation: 75, won: 100, lost: 0 })) {
      expect(revenue).toContain(`${stage}: ${probability}`);
    }
    expect(revenue).toContain('CRM_STAGE_DEFAULT_PROBABILITY[normalizedStage]');
  });

  test('production migration runner is locked, checksum protected and includes P2 workforce domains', () => {
    const runner = read('src/scripts/apply-p1-migrations.ts');
    const dockerfile = read('Dockerfile');
    expect(runner).toContain('pg_advisory_lock');
    expect(runner).toContain('suite_schema_migrations');
    expect(runner).toContain('checksum_sha256');
    expect(runner).toContain('Never edit an applied suite migration');
    for (const migration of ['20260812103000_p1_revenue_core','20260812112000_p1_supply_chain_core','20260812130000_p1_procurement_rfq','20260812140000_p1_append_only_guards','20260813023000_p2_workforce_attendance','20260813030000_p2_payroll_rate_profiles','20260813033000_p2_workforce_leave','20260813040000_p2_recruitment_core']) expect(runner).toContain(`'${migration}'`);
    expect(dockerfile).toContain('node:22-alpine');
    expect(dockerfile).toContain('node dist/scripts/apply-p1-migrations.js && exec node dist/server.js');
  });

  test('FNB router mounts revenue, supply-chain and workforce APIs', () => {
    const index = read('src/modules/fnb/index.ts');
    expect(index).toContain("router.use('/revenue', revenueRoutes)");
    expect(index).toContain("router.use('/supply-chain', supplyChainRoutes)");
    expect(index).toContain("router.use('/workforce', workforceRoutes)");
  });

  test('supplier and recipe source-of-truth controllers scope access to tenant outlets', () => {
    const supplier = read('src/modules/fnb/controllers/supplier.controller.ts');
    const recipe = read('src/modules/fnb/controllers/recipe.controller.ts');
    expect(supplier).toContain('tenant_id: tenantId');
    expect(supplier).toContain('outlet_id: { in: outletIds }');
    expect(recipe).toContain('tenant_id: tenantId');
    expect(recipe).toContain('INVALID_BOM_INGREDIENT');
  });

  test('manufacturing order creation validates BOM snapshot and serializes lifecycle transitions', () => {
    const manufacturing = read('src/modules/fnb/controllers/manufacturing.p1.controller.ts');
    expect(manufacturing).toContain('BOM_INGREDIENT_INVALID');
    expect(manufacturing).toContain('BOM_QUANTITY_INVALID');
    expect(manufacturing).toContain('INVALID_SCHEDULED_AT');
    expect(manufacturing).toContain('FOR UPDATE');
    expect(manufacturing).toContain('prisma.$transaction(async (tx) =>');
  });
});
