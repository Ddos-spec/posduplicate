import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  approveAgentAction,
  askIntelligenceCopilot,
  executeAgentAction,
  getIntelligenceDashboard,
  listAgentActions,
  rejectAgentAction,
  requestReplenishmentAction,
  runIntelligenceAnalysis,
} from '../controllers/intelligence.p4.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requireCapability('intelligence.read'), getIntelligenceDashboard);
router.post('/runs', requireCapability('intelligence.run'), runIntelligenceAnalysis);
router.post('/copilot/ask', requireCapability('intelligence.read'), askIntelligenceCopilot);
router.get('/actions', requireCapability('intelligence.read'), listAgentActions);
router.post('/actions', requireCapability('intelligence.actions.request'), requestReplenishmentAction);
router.post('/actions/:id/approve', requireCapability('intelligence.actions.approve'), approveAgentAction);
router.post('/actions/:id/reject', requireCapability('intelligence.actions.approve'), rejectAgentAction);
router.post('/actions/:id/execute', requireCapability('intelligence.actions.execute'), executeAgentAction);

export default router;
