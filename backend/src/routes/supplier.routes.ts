/**
 * Supplier routes - DISABLED
 *
 * Note: The 'supplier' model does not exist in the Prisma schema.
 * To enable this feature:
 * 1. Add 'supplier' model to prisma/schema.prisma
 * 2. Run: npx prisma generate
 * 3. Uncomment the code in src/controllers/supplier.controller.ts
 * 4. Uncomment this file
 */

import { Router } from 'express';

const router = Router();

// Routes commented out until supplier model is added to Prisma schema
/*
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

router.use(authMiddleware, tenantMiddleware);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
*/

export default router;
