# OmniPilot Odoo-Parity Blueprint

Status: active implementation branch `feat/odoo-complete-suite`

## Objective

Turn POSDuplicate from a broad POS/ERP application into an integrated business operating suite with application breadth comparable to Odoo while preserving the existing React + TypeScript + Express + Prisma + PostgreSQL foundation.

The target is not a visual clone. The target is functional category parity plus Indonesia-first differentiation.

## Verified Odoo parity baseline

Odoo 19 documentation and the official All Apps catalog group the suite around these business domains:

1. Finance
2. Sales
3. Websites
4. Supply Chain
5. Human Resources
6. Marketing
7. Services
8. Productivity
9. Customization / Studio
10. General platform capabilities such as users, companies, IoT, integrations, offline mode, and app/module management

Official references:
- https://www.odoo.com/documentation/19.0/applications.html
- https://www.odoo.com/page/all-apps

The OmniPilot launcher intentionally adds two differentiation groups beyond Odoo's core public catalog:
- Omnichannel Commerce
- AI & Intelligence

## Current implementation tiers

### LIVE
Capabilities with an existing routed workspace and material implementation in the repository.

- Accounting
- Point of Sale
- Inventory
- Social Marketing
- WhatsApp workspace
- Dashboards / reports
- Users & access
- Companies / outlets
- Integrations
- SaaS administration
- AI forecast
- Business analytics
- Broadcast and auto-reply workspaces

### IN PROGRESS
Capabilities that already have meaningful backend models, controllers, services, or adjacent UI but are not yet complete enough to claim full product parity.

- Invoicing
- Expenses
- Payments
- Tax / fiscal
- CRM
- Sales
- Blog/content workflow
- Live chat/helpdesk foundation
- Manufacturing / recipe foundation
- Purchase
- Employees
- Attendances
- Payroll
- Email marketing
- Marketing automation
- Documents
- Calendar
- IoT/device layer
- Audit/activity
- Marketplace hub
- Customer 360

### BLUEPRINT
Apps now represented in the suite taxonomy and queued for domain implementation. They must not be marketed as production-ready until acceptance criteria are met.

- ESG
- Subscriptions
- Rental
- Website
- eCommerce
- eLearning
- Forum
- Barcode
- Quality
- Maintenance
- PLM
- Repairs
- Recruitment
- Time Off
- Appraisals
- Referrals
- Fleet
- Frontdesk
- Lunch
- SMS Marketing
- Events
- Surveys
- Project
- Timesheets
- Planning
- Field Service
- Appointments
- Sign
- Spreadsheet
- Knowledge
- Phone / VoIP
- To-do
- Data Cleaning
- Studio
- Loyalty & Rewards
- Anomaly Monitor
- AI Business Copilot

## Product architecture rules

1. **One business object, one source of truth.** Do not create duplicate order, stock, customer, supplier, or accounting ledgers per module.
2. **Order engine first.** POS, dine-in, takeaway, QR ordering, marketplace orders, eCommerce and delivery must converge into one order lifecycle.
3. **Stock ledger first.** Inventory movement is append-only and auditable. UI stock numbers are projections of the ledger, not independent truth.
4. **Accounting is downstream but automatic.** Commercial events emit accounting events; journals are generated through service boundaries.
5. **Tenant isolation is mandatory.** Every business entity is tenant-scoped and outlet/warehouse scoped where applicable.
6. **Permissions are capability based.** Roles are presets; authorization must ultimately check capabilities/action permissions.
7. **Offline is a first-class operating mode for POS.** Local persistence, outbox queue, idempotency, sync state, conflict policy and reconciliation are required.
8. **No fake integrations.** External connectors require real OAuth/API credentials, token lifecycle, idempotency and health state before being marked live.
9. **No fake AI.** AI features must expose source data, confidence/context where relevant, and deterministic fallbacks for critical operations.
10. **No fake Odoo parity.** Catalog presence is not feature completion. Status labels must remain accurate.

## Donor / benchmark strategy

### X POS
Use as architectural reference for:
- offline-first POS
- local transaction persistence
- shift lifecycle
- return/refund flow
- loyalty
- purchasing/receiving
- permission depth

Only transplant code when license and dependency compatibility are verified.

### FloCafe / FloPOS
Use as reference for:
- restaurant table workflow
- KDS
- kitchen routing
- receipt/KOT behavior
- staff-oriented restaurant operations

### ERPNext
Use as domain-reference for:
- accounting
- procurement
- warehouse
- stock ledger
- manufacturing
- assets
- business workflow terminology

Do not blindly copy GPL code into proprietary product code. Reimplement domain behavior against OmniPilot architecture.

### Toast / Lightspeed / Shopify POS / Square
Use as product-specification benchmark for:
- cashier UX
- KDS
- offline continuity
- unified commerce
- customer 360
- return/refund
- multi-location inventory
- device/workforce operations

### Moka / Olsera / Majoo
Use as Indonesia parity benchmark for:
- QRIS
- local F&B workflow
- local marketplace operations
- multi-outlet SME use cases
- local accounting/tax expectations

## Delivery sequence

### P0 — Operating backbone
- Odoo-parity app registry and launcher
- stable tenant entitlement compatibility
- shared design-system shell
- true offline transaction architecture
- cashier shifts and cash drawer lifecycle
- refund / return / exchange / void engine
- unified order state machine
- KDS and kitchen routing
- audit/event infrastructure

### P1 — Revenue and supply chain
- CRM pipeline
- quotations and sales orders
- customer 360
- loyalty and wallet
- procurement / RFQ / PO / receiving
- warehouse locations / transfer / count
- barcode workflow
- manufacturing orders / BOM / yield
- quality and maintenance

### P2 — Workforce and services
- attendance
- payroll completion
- recruitment
- leave
- appraisal
- project
- timesheets
- planning
- field service
- helpdesk
- appointments

### P3 — Digital business suite
- website / CMS
- eCommerce
- subscriptions
- rental
- marketing automation depth
- events / surveys
- knowledge / documents / sign
- Studio-like configurable fields and workflow rules

### P4 — Intelligence layer
- anomaly monitoring
- cashflow intelligence
- margin leakage detection
- demand forecast
- replenishment recommendations
- AI business copilot
- controlled agent actions with approval and audit

## Acceptance criteria for an app to become LIVE

An application may be marked LIVE only when all of the following are true:

- dedicated production route exists
- API and database operations are real, not mock
- tenant isolation is verified
- role/capability authorization exists
- happy-path and critical failure-path tests exist
- audit trail exists for financial/stock/security-sensitive actions
- empty/loading/error states exist
- responsive UI is usable on intended device class
- no hard-coded demo values drive production decisions
- external integrations have health/error/retry behavior
- documentation describes operating workflow

## Branch review checklist

- Open `/module-selector` after login.
- Confirm all suite categories render.
- Search across app names and capabilities.
- Filter by category and implementation state.
- Confirm disabled tenant bundles remain hidden for non-super-admin tenants.
- Confirm LIVE/IN PROGRESS workspaces only link to real routes.
- Confirm BLUEPRINT apps clearly state that architecture is queued.
- Confirm existing POS, accounting, inventory, and social routes remain unchanged.
