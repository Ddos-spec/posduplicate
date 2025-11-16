import { Router } from 'express';
import { getAdminNotifications } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { superAdminOnly } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require Super Admin access
router.use(authMiddleware, superAdminOnly);

router.get('/admin', getAdminNotifications);

export default router;
