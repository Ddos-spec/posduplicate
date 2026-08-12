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
      expect(source).toContain('authMiddleware');
      expect(source).toContain('tenantMiddleware');
      expect(source).toMatch(/router\.use\(authMiddleware, tenantMiddleware\)/);
      expect(source).toContain('requireCapability');
    }

    expect(revenueRoutes).toContain("requireCapability('revenue.sales.manage')");
    expect(supplyRoutes).toContain("requireCapability('supply.warehouse.manage')");
    expect(purchaseRoutes).toContain("requireCapability('supply.procurement.manage')");
    expect(supplierRoutes).toContain("router.get('/', requireCapability('supply.procurement.read'), getSuppliers)");
    expect(supplierRoutes).toContain("router.get('/spending', requireCapability('supply.procurement.read'), getSupplierSpending)");
    expect(supplierRoutes).toContain("router.get('/:id', requireCapability('supply.procurement.read'), getSupplier)");
    expect(supplierRoutes).toContain("router.post('/', requireCapability('supply.procurement.manage'), createSupplier)");
    expect(supplierRoutes).toContain("router.put('/:id', requireCapability('supply.procurement.manage'), updateSupplier)");
    expect(supplierRoutes).toContain("router.delete('/:id', requireCapability('supply.procurement.manage'), deleteSupplier)");
    expect(supplierRoutes).not.toContain('ownerOnly');

    expect(recipeRoutes).toContain("router.get('/', requireCapability('supply.manufacturing.read'), getRecipes)");
    expect(recipeRoutes).toContain("router.get('/product/:itemId', requireCapability('supply.manufacturing.read'), getRecipeByItemId)");
    expect(recipeRoutes).toContain("router.post('/product/:itemId', requireCapability('supply.manufacturing.manage'), updateProductRecipe)");
    expect(recipeRoutes).toContain("router.post('/', requireCapability('supply.manufacturing.manage'), addRecipeItem)");
    expect(recipeRoutes).toContain("router.delete('/:id', requireCapability('supply.manufacturing.manage'), deleteRecipeItem)");
    expect(recipeRoutes).not.toContain('ownerOnly');
  });

  test('workforce routes use tenant context and named capabilities', () => {
    const workforceRoutes = read('src/modules/fnb/routes/workforce.routes.ts');
    expect(workforceRoutes).toContain('authMiddleware');
    expect(workforceRoutes).toContain('tenantMiddleware');
    expect(workforceRoutes).toContain("requireCapability('workforce.employee.read')");
    expect(workforceRoutes).toContain("requireCapability('workforce.attendance.read')");
    expect(workforceRoutes).toContain("requireCapability('workforce.attendance.self')");
  });

  test('revenue financial mutations require named capabilities', () => {
    const revenueRoutes = read('src/modules/fnb/routes/revenue.routes.ts');
    expect(revenueRoutes).toMatch(/quotations\/:id\/status', requireCapability\('revenue\.sales\.manage'\), updateQuotationStatus/);
    expect(revenueRoutes).toMatch(/quotations\/:id\/convert', requireCapability\('revenue\.sales\.manage'\), convertQuotationToOrder/);
    expect(revenueRoutes).toMatch(/loyalty\/:customerId\/adjust', requireCapability\('revenue\.loyalty\.adjust'\), adjustLoyaltyWallet/);
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

  test('P1 migrations use JSON-safe identifiers and define core modules', () => {
    const revenueMigration = read('prisma/migrations/20260812103000_p1_revenue_core/migration.sql');
    const supplyMigration = read('prisma/migrations/20260812112000_p1_supply_chain_core/migration.sql');

    expect(revenueMigration).not.toContain('BIGSERIAL');
    expect(supplyMigration).not.toContain('BIGSERIAL');

    for (const table of ['crm_opportunities', 'sales_quotations', 'sales_orders', 'loyalty_ledger']) expect(revenueMigration).toContain(`public.${table}`);
    for (const table of ['warehouse_locations', 'warehouse_stock_ledger', 'stock_transfers', 'stock_counts', 'barcode_aliases', 'manufacturing_orders', 'quality_checks', 'maintenance_requests']) expect(supplyMigration).toContain(`public.${table}`);
  });

  test('production migration runner is forward-only, locked, checksum protected and includes P2 attendance', () => {
    const runner = read('src/scripts/apply-p1-migrations.ts');
    const dockerfile = read('Dockerfile');

    expect(runner).toContain('pg_advisory_lock');
    expect(runner).toContain('suite_schema_migrations');
    expect(runner).toContain('checksum_sha256');
    expect(runner).toContain('already applied');
    expect(runner).toContain('Never edit an applied suite migration');
    expect(runner).toContain("'20260812103000_p1_revenue_core'");
    expect(runner).toContain("'20260812112000_p1_supply_chain_core'");
    expect(runner).toContain("'20260812130000_p1_procurement_rfq'");
    expect(runner).toContain("'20260812140000_p1_append_only_guards'");
    expect(runner).toContain("'20260813023000_p2_workforce_attendance'");
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
    expect(recipe).toContain('outlet_id: { in: outletIds }');
    expect(recipe).toContain('outlet_id: outletId');
    expect(recipe).toContain('INVALID_BOM_INGREDIENT');
  });

  test('manufacturing order creation validates BOM snapshot and serializes lifecycle transitions', () => {
    const manufacturing = read('src/modules/fnb/controllers/manufacturing.p1.controller.ts');
    expect(manufacturing).toContain('BOM_INGREDIENT_INVALID');
    expect(manufacturing).toContain('BOM_QUANTITY_INVALID');
    expect(manufacturing).toContain('INVALID_SCHEDULED_AT');
    expect(manufacturing).toContain("SELECT * FROM public.manufacturing_orders WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE");
    expect(manufacturing).toContain("prisma.$transaction(async (tx) =>");
  });
});
