import { Router } from 'express';
import { getSettings, updateSettings, changePassword } from '../controllers/settings.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Settings routes (Owner/Manager only via tenant middleware)
router.get('/', tenantMiddleware, getSettings);
router.put('/', tenantMiddleware, updateSettings);

// Password change (any authenticated user)
router.post('/change-password', changePassword);

export default router;
