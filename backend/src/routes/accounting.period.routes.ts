import express from 'express';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import * as periodController from '../controllers/accounting.period.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/', periodController.getPeriods);
router.post('/', roleMiddleware(['Owner', 'Super Admin']), periodController.createPeriod);
router.post('/:id/close', roleMiddleware(['Owner', 'Super Admin']), periodController.closePeriod);

export default router;
