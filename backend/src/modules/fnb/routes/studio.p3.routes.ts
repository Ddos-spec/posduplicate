import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  applyStudioRules,
  createStudioField,
  createStudioRule,
  getStudioRecordValues,
  getStudioWorkspace,
  previewStudioRules,
  updateStudioFieldStatus,
  updateStudioRuleStatus,
  upsertStudioRecordValue,
} from '../controllers/studio.p3.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requireCapability('platform.studio.read'), getStudioWorkspace);
router.post('/fields', requireCapability('platform.studio.manage'), createStudioField);
router.patch('/fields/:id/status', requireCapability('platform.studio.manage'), updateStudioFieldStatus);
router.get('/values/:entityType/:recordKey', requireCapability('platform.studio.read'), getStudioRecordValues);
router.put('/values', requireCapability('platform.studio.manage'), upsertStudioRecordValue);
router.post('/rules', requireCapability('platform.studio.manage'), createStudioRule);
router.patch('/rules/:id/status', requireCapability('platform.studio.manage'), updateStudioRuleStatus);
router.post('/rules/preview', requireCapability('platform.studio.read'), previewStudioRules);
router.post('/rules/apply', requireCapability('platform.studio.manage'), applyStudioRules);

export default router;
