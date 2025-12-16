import express from 'express';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import * as dashboardController from '../controllers/accounting.dashboard.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/stats', dashboardController.getStats);
router.get('/chart', dashboardController.getChartData);

router.get('/distributor', roleMiddleware(['Distributor', 'Owner', 'Super Admin']), dashboardController.getDistributorDashboard);
router.get('/produsen', roleMiddleware(['Produsen', 'Owner', 'Super Admin']), dashboardController.getProdusenDashboard);
router.get('/retail', roleMiddleware(['Retail', 'Owner', 'Super Admin']), dashboardController.getRetailDashboard);

export default router;
