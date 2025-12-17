import { Router } from 'express';
import { getIntegrations, updateIntegration } from '../controllers/integration.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require Auth + Tenant + Owner Permission
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(ownerOnly);

// Get all integrations status
router.get('/', getIntegrations);

// Update specific integration (e.g., PUT /api/integrations/gofood)
router.put('/:integrationType', updateIntegration);

export default router;
