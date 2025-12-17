import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as aparController from '../controllers/accounting.apar.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

// AP Routes
router.get('/ap', aparController.getAP);
router.post('/ap/:id/pay', roleMiddleware(['Owner', 'Super Admin', 'Manager']), aparController.payAP);

// AR Routes
router.get('/ar', aparController.getAR);
router.post('/ar/:id/collect', roleMiddleware(['Owner', 'Super Admin', 'Manager']), aparController.collectAR);

export default router;
