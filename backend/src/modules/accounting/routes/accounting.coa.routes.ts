import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as coaController from '../controllers/accounting.coa.controller';

const router = express.Router();

// Middleware Stack
// 1. Authenticate (JWT)
// 2. Attach User/Tenant Context
// 3. Audit Logging (for mutations)
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

// Routes
router.get('/', coaController.getCoA);
router.post('/', roleMiddleware(['Owner', 'Super Admin']), coaController.createAccount);
router.post('/seed', roleMiddleware(['Owner', 'Super Admin']), coaController.seedCoA);
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin']), coaController.updateAccount);

export default router;
