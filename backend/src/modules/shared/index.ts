import { Router } from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import tenantRoutes from './routes/tenant.routes';
import outletRoutes from './routes/outlet.routes';
import settingsRoutes from './routes/settings.routes';
import printerSettingsRoutes from './routes/printerSettings.routes';
import uploadRoutes from './routes/upload.routes';
import webhookRoutes from './routes/webhook.routes';
import integrationRoutes from './routes/integration.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import notificationRoutes from './routes/notification.routes';
import activityLogRoutes from './routes/activity-log.routes';
import ownerApiRoutes from './routes/ownerApi.routes';

const router = Router();

// Shared/Common Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/outlets', outletRoutes);
router.use('/settings', settingsRoutes);
router.use('/printer-settings', printerSettingsRoutes);
router.use('/upload', uploadRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/integrations', integrationRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/owner', ownerApiRoutes);

export default router;
