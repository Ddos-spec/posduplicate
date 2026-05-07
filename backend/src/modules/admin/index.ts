import { Router } from 'express';
import adminAnalyticsRoutes from './routes/admin.analytics.routes';
import billingRoutes from './routes/billing.routes';
import myCommerSocialAdminRoutes from './routes/myCommerSocialAdmin.routes';

const router = Router();

// Admin Routes
router.use('/analytics', adminAnalyticsRoutes);
router.use('/billing', billingRoutes);
router.use('/mycommersocial', myCommerSocialAdminRoutes);

export default router;
