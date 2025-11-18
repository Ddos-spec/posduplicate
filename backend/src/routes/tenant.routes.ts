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
  checkGoogleApiHealth
} from '../controllers/tenant.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { superAdminOnly, tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Tenant user routes
router.get('/me', authMiddleware, tenantMiddleware, getMyTenant);

// Super Admin only routes
router.get('/', authMiddleware, superAdminOnly, getAllTenants);
router.get('/:id', authMiddleware, superAdminOnly, getTenantById);
router.post('/', createTenant); // Public for self-registration
router.put('/:id', authMiddleware, superAdminOnly, updateTenant);
router.patch('/:id/status', authMiddleware, superAdminOnly, toggleTenantStatus);
router.patch('/:id/subscription', authMiddleware, superAdminOnly, updateSubscription);
router.delete('/:id', authMiddleware, superAdminOnly, deleteTenant);

// Google API health check route
router.get('/google-api-health', authMiddleware, superAdminOnly, checkGoogleApiHealth);

export default router;
