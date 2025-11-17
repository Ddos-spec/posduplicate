import { Router } from 'express';
import { getAdminNotifications, getTenantNotifications } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { superAdminOnly } from '../middlewares/tenant.middleware';

const router = Router();

// Admin notifications route - requires super admin access
router.get('/admin', authMiddleware, superAdminOnly, getAdminNotifications);

// Tenant notifications route - any authenticated user can access their own tenant notifications
router.get('/tenant', authMiddleware, getTenantNotifications);

export default router;
