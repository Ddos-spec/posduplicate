import { Router } from 'express';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  toggleTenantStatus,
  updateSubscription,
  getMyTenant,
  deleteTenant,
} from '../controllers/tenant.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly, tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Tenant user routes
router.get('/me', authMiddleware, tenantMiddleware, getMyTenant);

// Super Admin only routes
router.get('/', authMiddleware, superAdminOnly, getAllTenants);
router.get('/:id', authMiddleware, superAdminOnly, getTenantById);
router.post('/', authMiddleware, superAdminOnly, createTenant); // Protected - admin creation only
router.put('/:id', authMiddleware, superAdminOnly, updateTenant);
router.patch('/:id/status', authMiddleware, superAdminOnly, toggleTenantStatus);
router.patch('/:id/subscription', authMiddleware, superAdminOnly, updateSubscription);
router.delete('/:id', authMiddleware, superAdminOnly, deleteTenant);

export default router;
