# System Architecture Documentation

## 1. High-Level Overview
This project is a comprehensive **Multi-Tenant Point of Sale (POS) & ERP System** designed for F&B and Retail businesses. It integrates Front-Office operations (Cashier/POS) with Back-Office functions (Inventory, Accounting, CRM, HR, Social Media Management).

### Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Zustand (State Management), React Query/Axios.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database**: PostgreSQL (managed via Prisma ORM).
- **Testing**: Jest (Unit & Integration), GitHub Actions (CI).
- **Infrastructure**: Docker support, Vercel-ready (Frontend).

---

## 2. Backend Architecture (`/backend`)

The backend follows a **Modular Monolith** pattern. Logic is grouped by business domain (modules) rather than technical layers alone.

### Directory Structure
```
backend/src/
├── config/         # Database & Env config
├── middlewares/    # Auth, Tenant Isolation, Error Handling
├── modules/        # Business Logic Modules
│   ├── accounting/ # Double-entry bookkeeping, Journals, Reports
│   ├── admin/      # System Administration, Billing
│   ├── fnb/        # Core POS, Inventory, Products, Recipes
│   ├── medsos/     # Social Media Management (Post Scheduling)
│   └── shared/     # Cross-module logic (Auth, Users, Uploads)
├── services/       # Complex business logic (e.g., Auto-Journaling)
└── utils/          # Helpers (Prisma client, Encryption)
```

### Key Design Patterns
1.  **Multi-Tenancy**: Data isolation is enforced via `tenantMiddleware`. Most database queries are filtered by `tenant_id` and `outlet_id`.
2.  **Controller-Service-Repository**:
    *   *Controllers* handle HTTP requests and validation.
    *   *Services* (e.g., `autoJournal.service`) handle complex background logic.
    *   *Prisma* acts as the Data Access Layer.
3.  **Automated Journaling**: A critical feature where POS transactions (`fnb` module) automatically trigger Journal Entries (`accounting` module) via hooks or events.

---

## 3. Database Schema (PostgreSQL + Prisma)

The database uses **Schema Separation** to organize tables:

### A. Public Schema (Operational Data)
- **Tenancy**: `tenants`, `outlets`, `users`, `roles`.
- **Master Data**: `items`, `categories`, `ingredients`, `recipes`.
- **Operations**: `transactions`, `stock_movements`, `purchase_orders`.
- **Modules**: `social_posts`, `customers`.

### B. Accounting Schema (Financial Data)
- **Core**: `chart_of_accounts`, `journal_entries`, `general_ledger`.
- **Sub-ledgers**: `accounts_payable`, `accounts_receivable`.
- **Assets**: `fixed_assets`, `depreciation_logs`.

---

## 4. Frontend Architecture (`/frontend`)

The frontend is a Single Page Application (SPA) with Role-Based Access Control (RBAC).

### Key Components
- **Stores (`/store`)**: Global state using Zustand (`authStore`, `cartStore`).
- **Services (`/services`)**: API wrappers using Axios interceptors for Auth headers.
- **Pages (`/pages`)**:
    *   `CashierPage`: Optimized for high-frequency transactions.
    *   `OwnerDashboard`: Analytics and Management.
    *   `Accounting`: Financial reports and Journal management.
    *   `Medsos`: Content calendar and scheduling.

---

## 5. CI/CD & Testing Strategy

We employ a **"Robotic Testing"** strategy using GitHub Actions.

### Automated Tests (`backend/tests/`)
- **Framework**: Jest + Supertest + ts-jest.
- **Scope**:
    1.  **Inventory Logic**: Verifies stock deduction based on Recipes (F&B) or Item Tracking (Retail).
    2.  **Accounting**: Verifies Journal Entry creation and Balancing.
    3.  **Medsos**: Verifies Post creation and Scheduling logic.
    4.  **Auth & CRM**: Verifies Login, Registration, and Customer data flow.
- **Workflow**: `.github/workflows/backend-ci.yml` runs on every Push/Pull Request.

---

## 6. Critical Business Flows

### A. Transaction & Inventory Deduction
1.  **Request**: Cashier sends `POST /transactions`.
2.  **Validation**: Backend checks Stock (if tracked) and Ingredients.
3.  **Execution**:
    *   Transaction record created.
    *   `items.stock` deducted (for Retail items).
    *   `recipes` looked up -> `ingredients.stock` deducted (for F&B items).
4.  **Post-Process**: `generateJournalFromPOSTransaction` is called asynchronously to record Revenue and COGS in Accounting.

### B. Purchase Order (PO) Cycle
1.  **Draft**: PO created with items.
2.  **Approval**: Manager approves PO.
3.  **Receive**: Goods arrive -> User inputs received qty.
4.  **Effect**: `inventory.stock` increases automatically.

---

## 7. Future Roadmap
- **Medsos Integration**: Connect `social_posts` table to real Instagram/Facebook Graph API.
- **Mobile App**: Develop React Native / Flutter app consuming the same Backend API.
- **Offline Mode**: Enhance PWA capabilities for offline POS transactions with sync.
