# Task: Complete Swagger API Documentation Annotations

## Context
Project ini udah punya setup Swagger UI di `/api-docs` dengan konfigurasi di `backend/src/config/swagger.ts`. Beberapa endpoint udah diannotate (Auth, Products, Transactions), tapi masih banyak yang belum.

## Your Task
Tambahkan Swagger/OpenAPI annotations ke **SEMUA** route files yang belum punya documentation.

## Files Already Annotated ✅
- `backend/src/modules/shared/routes/auth.routes.ts` (Login, Register, Me, Change Password)
- `backend/src/modules/fnb/routes/product.routes.ts` (GET, POST, PUT, DELETE products)
- `backend/src/modules/fnb/routes/transaction.routes.ts` (GET, POST, PUT, DELETE transactions)

## Files That Need Annotations ❌

### FnB Module (`backend/src/modules/fnb/routes/`)
- [ ] `inventory.routes.ts` - Inventory management
- [ ] `inventory-module.routes.ts` - Advanced inventory
- [ ] `category.routes.ts` - Category CRUD
- [ ] `customer.routes.ts` - Customer management
- [ ] `supplier.routes.ts` - Supplier management
- [ ] `expense.routes.ts` - Expense tracking
- [ ] `ingredient.routes.ts` - Recipe ingredients
- [ ] `modifier.routes.ts` - Product modifiers
- [ ] `variant.routes.ts` - Product variants
- [ ] `promotion.routes.ts` - Promotions/discounts
- [ ] `recipe.routes.ts` - Recipe management
- [ ] `table.routes.ts` - Table management
- [ ] `stockMovement.routes.ts` - Stock movements
- [ ] `purchase-orders.routes.ts` - Purchase orders
- [ ] `inventory-settings.routes.ts` - Inventory settings
- [ ] `analytics.routes.ts` - Business analytics
- [ ] `dashboard.routes.ts` - Dashboard stats
- [ ] `report.routes.ts` - Financial reports
- [ ] `sales-analytics.routes.ts` - Sales analytics

### Accounting Module (`backend/src/modules/accounting/routes/`)
- [ ] `accounting.coa.routes.ts` - Chart of Accounts
- [ ] `accounting.journal.routes.ts` - Journal entries
- [ ] `accounting.report.routes.ts` - Financial reports
- [ ] `accounting.apar.routes.ts` - Accounts Payable/Receivable
- [ ] `accounting.period.routes.ts` - Accounting periods
- [ ] `accounting.dashboard.routes.ts` - Accounting dashboard
- [ ] `accounting.ledger.routes.ts` - General ledger
- [ ] `accounting.forecast.routes.ts` - Financial forecasting
- [ ] `accounting.budget.routes.ts` - Budget management
- [ ] `accounting.reconciliation.routes.ts` - Bank reconciliation
- [ ] `accounting.asset.routes.ts` - Fixed assets
- [ ] `accounting.tax.routes.ts` - Tax management
- [ ] `accounting.rolebased.routes.ts` - Role-based dashboards
- [ ] `accounting.settings.routes.ts` - Accounting settings
- [ ] `accounting.advanced-forecast.routes.ts` - Advanced forecasting
- [ ] `accounting.efaktur.routes.ts` - e-Faktur integration
- [ ] `accounting.approval.routes.ts` - Approval workflows
- [ ] `accounting.psak.routes.ts` - PSAK compliance
- [ ] `accounting.attachment.routes.ts` - Document attachments
- [ ] `accounting.payroll.routes.ts` - Payroll with PPh 21

### Admin Module (`backend/src/modules/admin/routes/`)
- [ ] `admin.analytics.routes.ts` - Super admin analytics
- [ ] `billing.routes.ts` - Billing management

### Shared Module (`backend/src/modules/shared/routes/`)
- [ ] `tenant.routes.ts` - Tenant management
- [ ] `user.routes.ts` - User management
- [ ] `outlet.routes.ts` - Outlet management
- [ ] `apiKey.routes.ts` - API key management
- [ ] `integration.routes.ts` - Third-party integrations
- [ ] `webhook.routes.ts` - Webhook management

### Medsos Module (`backend/src/modules/medsos/routes/`)
- [ ] `account.routes.ts` - Social media accounts
- [ ] `post.routes.ts` - Social media posts

## Annotation Template

Gunakan format ini untuk setiap endpoint:

```typescript
/**
 * @swagger
 * /api/endpoint-path:
 *   get:
 *     tags: [TagName]
 *     summary: Brief description of endpoint
 *     description: Detailed description (optional)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/endpoint', middleware, handler);
```

## Tags Available
Defined in `backend/src/config/swagger.ts`:
- Auth
- Products
- Transactions
- Inventory
- Categories
- Customers
- Suppliers
- Expenses
- Analytics
- Accounting
- Admin
- Tenants
- Users

**Tambahkan tags baru jika perlu** (e.g., "Modifiers", "Variants", "Recipes", "Tables", "Purchase Orders", "Social Media")

## Important Notes

### Security
- Most endpoints require `security: - bearerAuth: []`
- Public endpoints (like `GET /products/:id`) tidak perlu security

### Parameters
- **Path parameters**: `in: path`, `required: true`
- **Query parameters**: `in: query`, `required: false` (kecuali wajib)
- **Request body**: gunakan `requestBody` dengan `required: true/false`

### Response Schema
- Semua response pake format:
  ```json
  {
    "success": true/false,
    "data": {...},     // kalo success
    "error": {...},    // kalo failed
    "message": "..."   // optional
  }
  ```
- Gunakan `$ref: '#/components/schemas/Error'` untuk error responses
- Gunakan `$ref: '#/components/schemas/Success'` untuk generic success

### HTTP Methods
- `GET` - Retrieve data
- `POST` - Create new resource
- `PUT` / `PATCH` - Update existing resource
- `DELETE` - Delete resource

## Example: Complete Route File Annotation

```typescript
import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Apply auth + tenant middleware to all routes
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     description: Get all product categories for the tenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [item, ingredient]
 *         description: Filter by category type
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                 count:
 *                   type: integer
 */
router.get('/', getCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create new category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Beverages
 *               type:
 *                 type: string
 *                 enum: [item, ingredient]
 *                 default: item
 *               outletId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 */
router.put('/:id', updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
router.delete('/:id', deleteCategory);

export default router;
```

## Steps to Complete

1. **Pilih satu file** dari list di atas
2. **Baca file route-nya** untuk understand endpoint structure
3. **Baca controller** (optional) untuk detail parameter/response
4. **Tambahkan annotations** sesuai template di atas
5. **Test** dengan akses `http://localhost:3000/api-docs` dan cek endpoint muncul di Swagger UI
6. **Repeat** untuk file berikutnya

## Testing

Setelah annotate beberapa files:

1. Start backend: `cd backend && npm run dev`
2. Buka browser: `http://localhost:3000/api-docs`
3. Verify:
   - Endpoints muncul di kategori yang benar
   - Parameters terdefinisi dengan jelas
   - Request body schema benar
   - Response examples ada
   - "Try it out" button works

## Prioritas

**High Priority** (Core features):
1. Inventory, Categories, Customers, Suppliers (FnB)
2. Dashboard, Analytics, Reports (FnB)
3. Chart of Accounts, Journal, Reports (Accounting)
4. Tenants, Users, Outlets (Shared)

**Medium Priority**:
5. Modifiers, Variants, Recipes, Tables (FnB)
6. Ledger, Budgets, Assets (Accounting)
7. Admin analytics

**Low Priority**:
8. Advanced accounting features (PSAK, e-Faktur, Payroll)
9. Social media module

## Expected Output

Semua 60+ endpoints ter-dokumentasi dengan baik di Swagger UI, memudahkan:
- Frontend developers untuk integrate API
- QA untuk testing endpoints
- External developers untuk consume API
- Documentation yang always up-to-date dengan code

## Notes
- Ga perlu terlalu detail di schema. Focus di clarity & correctness.
- Copy-paste template di atas dan adjust parameter/response sesuai endpoint.
- Kalo ada pertanyaan tentang structure, liat file yang udah di-annotate sebagai reference.

Good luck! 🚀
