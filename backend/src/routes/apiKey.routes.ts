import { Router } from 'express';
import {
  getTenantApiKeys,
  getMyApiKeys,
  createApiKey,
  toggleApiKeyStatus,
  deleteApiKey,
  getApiDocumentation,
} from '../controllers/apiKey.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { superAdminOnly, ownerOnly, tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// API Documentation (Admin only)
router.get('/documentation', authMiddleware, superAdminOnly, getApiDocumentation);

// Admin routes - manage API keys for any tenant
router.get('/tenant/:tenantId', authMiddleware, superAdminOnly, getTenantApiKeys);
router.post('/tenant/:tenantId', authMiddleware, superAdminOnly, createApiKey);
router.patch('/:keyId/toggle', authMiddleware, superAdminOnly, toggleApiKeyStatus);
router.delete('/:keyId', authMiddleware, superAdminOnly, deleteApiKey);

// Owner routes - view their own API keys (read-only)
router.get('/my-keys', authMiddleware, tenantMiddleware, ownerOnly, getMyApiKeys);

export default router;
