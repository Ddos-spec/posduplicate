import { Router } from 'express';
import adminAnalyticsRoutes from './routes/admin.analytics.routes';
import billingRoutes from './routes/billing.routes';

const router = Router();

// Admin Routes
router.use('/analytics', adminAnalyticsRoutes);
router.use('/billing', billingRoutes);

export default router;
