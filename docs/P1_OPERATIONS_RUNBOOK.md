# P1 Operations Runbook

Branch target: `feat/odoo-complete-suite`

P1 is the first functional-parity tranche after the suite catalog foundation. It is intentionally kept **IN PROGRESS** until the acceptance gates in this document pass. A card existing in the launcher is not sufficient to call an app LIVE.

## 1. P1 scope

### Revenue Operations

- CRM opportunities and activities
- Quotation lifecycle
- Quote-to-sales-order conversion
- Customer 360 aggregation
- Loyalty wallet + append-only loyalty ledger

Workspace: `/revenue`

### Supply Chain Operations

- Supplier master hardening
- RFQ multi-supplier sourcing
- Supplier quote comparison and selection
- RFQ-to-PO conversion
- PO approval/order/receiving state machine
- Warehouse locations and location balances
- Internal stock transfer
- Cycle stock count and reconciliation
- Barcode aliases and lookup
- Manufacturing orders from recipe/BOM snapshot
- Material consumption and finished-goods output
- Quality checks
- Equipment and maintenance requests

Workspace: `/supply-chain`

## 2. Source-of-truth rules

P1 extends the existing system instead of creating a parallel ERP database.

- `inventory.current_stock` remains canonical aggregate inventory stock.
- `warehouse_stock_balances` refines where inventory is physically located.
- Internal warehouse transfers must not alter aggregate inventory stock.
- Receiving and stock-count variance update aggregate stock and the warehouse audit ledger in the same transaction.
- Existing `recipes` remain the BOM source. Manufacturing orders snapshot the recipe at MO creation time.
- Existing `customers` remain the customer master. Customer 360 aggregates existing transactions, receivables, CRM, sales orders and loyalty.
- Existing `suppliers` remain the supplier master.

## 3. Append-only audit rules

Historical ledgers are never edited to hide a prior event. Corrections are compensating events.

Append-only P1 ledgers:

- `loyalty_ledger`
- `warehouse_stock_ledger`
- `procurement_event_ledger`
- existing `stock_movements` is retained for aggregate inventory movement history

## 4. Capability authorization

P1 routes use named capabilities through `requireCapability()`.

Examples:

- `revenue.crm.read`
- `revenue.crm.manage`
- `revenue.sales.read`
- `revenue.sales.manage`
- `revenue.loyalty.adjust`
- `supply.procurement.read`
- `supply.procurement.manage`
- `supply.warehouse.manage`
- `supply.barcode.manage`
- `supply.manufacturing.manage`
- `supply.quality.manage`
- `supply.maintenance.manage`

Tenant-specific overrides live under:

```json
{
  "features": {
    "capabilities": {
      "revenue.loyalty.adjust": false,
      "supply.procurement.manage": true
    }
  }
}
```

An explicit tenant capability override wins over the role preset. Role presets are only backward-compatible defaults.

## 5. Procurement workflow

### RFQ

1. Create RFQ with one outlet, at least one inventory line and at least one supplier.
2. Send RFQ.
3. Record each supplier response with complete unit prices for every RFQ line.
4. Compare quote total, lead time and availability.
5. Select one responded supplier.
6. Convert RFQ to a draft PO.
7. Submit/approve/order PO using the PO state machine.
8. Receive goods.

RFQ conversion is idempotent. Repeating conversion after success returns the existing PO rather than creating a duplicate.

### PO receiving

Receiving is atomic:

1. lock tenant-owned PO;
2. validate cumulative received quantity;
3. ensure default warehouse `MAIN` and `RECEIVE` locations;
4. seed old aggregate stock once if warehouse allocation does not yet exist;
5. increase `RECEIVE` location balance;
6. append warehouse receipt ledger event;
7. update canonical `inventory.current_stock`;
8. append existing aggregate `stock_movements` event;
9. update PO received quantity/status;
10. commit all changes together.

A failure in any step rolls back the whole receipt.

## 6. Warehouse workflow

### Initial bootstrap

Use **Bootstrap warehouse** once per tenant. It creates default locations per outlet:

- `MAIN`
- `RECEIVE`
- `QC`
- `PROD`
- `DISPATCH`

Existing aggregate stock without a location allocation is assigned to `MAIN` once.

### Internal transfer

`MAIN -> PROD`, `RECEIVE -> QC`, etc. only move location balances. Aggregate inventory must remain unchanged.

### Cycle count

1. start count on one location;
2. snapshot expected quantities;
3. enter counted quantities;
4. finalize;
5. location variance is written to the warehouse ledger;
6. aggregate inventory is reconciled by the same variance and recorded in existing stock movements.

## 7. Manufacturing workflow

1. Product must have an existing recipe/BOM.
2. Create MO; BOM is snapshotted into `manufacturing_consumptions`.
3. Confirm MO.
4. Start MO.
5. Complete MO with actual produced quantity.
6. Material stock is consumed.
7. Finished product stock is increased when stock tracking is enabled.
8. A pending production-output QC is created automatically.

A material shortage must block completion and roll back all production postings.

## 8. Quality workflow

QC status:

- `pending`
- `pass`
- `fail`
- `waived`

Production completion creates a pending QC automatically. Manual QC can also be created for receiving or inventory checks.

## 9. Maintenance workflow

Equipment status:

- `operational`
- `maintenance`
- `down`
- `retired`

Request lifecycle:

- `open`
- `planned`
- `in_progress`
- `done`
- `cancelled`

Critical maintenance can mark equipment down. Starting work marks the equipment in maintenance. Completion restores operational status unless the equipment is retired.

## 10. Production migration strategy

The repository's historical Prisma migration directory does not contain a full legacy baseline. Therefore P1 does **not** edit or fake old production migrations.

The production image runs:

```bash
node dist/scripts/apply-p1-migrations.js
```

before the API server starts.

The runner:

- acquires a PostgreSQL advisory lock;
- tracks P1 forward migrations in `suite_schema_migrations`;
- stores SHA-256 checksums;
- applies each migration inside a transaction;
- fails on checksum drift;
- is idempotent;
- prevents API startup if migration fails.

Never edit an already-applied P1 SQL migration. Add a new forward migration.

## 11. CI acceptance gates

P1 branch must pass:

1. frontend production Vite build;
2. backend Prisma generate;
3. backend TypeScript build;
4. backend Jest tests;
5. legacy schema baseline creation in disposable Postgres;
6. production P1 migration runner;
7. second migration-runner execution to prove idempotency;
8. required P1 table verification;
9. migration ledger checksum verification;
10. production backend Docker image build.

The repository still has pre-existing strict frontend TypeScript debt in legacy areas. It remains visible as a diagnostic and must not be confused with production Vite build success.

## 12. P1 LIVE acceptance checklist

Do not promote a P1 app from `IN PROGRESS` to `LIVE` unless all relevant checks are true.

### Global

- [ ] Tenant isolation verified
- [ ] Capability authorization verified
- [ ] Important mutation audit trail exists
- [ ] Empty/loading/error states are usable
- [ ] Happy-path test exists
- [ ] Critical-failure test exists
- [ ] Production migration runner is green
- [ ] Docker production build is green
- [ ] Operator workflow documented

### Revenue

- [ ] CRM create/stage/activity tested
- [ ] Quote create/status/convert tested
- [ ] Duplicate quote conversion blocked/idempotent
- [ ] Customer360 tenant scoping tested
- [ ] Loyalty negative balance blocked
- [ ] Loyalty tenant capability deny tested

### Procurement

- [ ] Multi-supplier RFQ tested
- [ ] Incomplete supplier quote rejected
- [ ] Supplier selection requires valid response
- [ ] RFQ conversion is idempotent
- [ ] PO illegal status transition rejected
- [ ] Over-receiving rejected
- [ ] Receiving rollback verified

### Warehouse

- [ ] Bootstrap is idempotent
- [ ] Transfer with insufficient location stock rejected
- [ ] Internal transfer preserves aggregate stock
- [ ] Stock count prevents negative aggregate stock
- [ ] Warehouse ledger remains append-only

### Manufacturing / Quality / Maintenance

- [ ] MO without BOM rejected
- [ ] MO material shortage rejected atomically
- [ ] MO completion posts output and creates QC
- [ ] Closed QC cannot be resolved again
- [ ] Critical maintenance changes equipment state
- [ ] Maintenance completion restores allowed equipment state

## 13. Rollback strategy

P1 migrations are forward-only. Schema rollback is not performed automatically because destructive down migrations can destroy operational audit history.

Application rollback procedure:

1. stop traffic to the new P1 workspace;
2. deploy the previous application image if required;
3. leave P1 tables intact;
4. fix defects with a forward migration or compensating data event;
5. redeploy and re-enable P1 routes.

This preserves auditability and avoids destructive emergency schema changes.
