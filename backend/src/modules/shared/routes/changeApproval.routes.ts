import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { ownerOnly, tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  approveOperationalChange,
  getOperationalChangeNotificationFeed,
  getOperationalChangeRequests,
  rejectOperationalChange
} from '../controllers/changeApproval.controller';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', ownerOnly, getOperationalChangeRequests);
router.get('/feed', ownerOnly, getOperationalChangeNotificationFeed);
router.post('/:id/approve', ownerOnly, approveOperationalChange);
router.post('/:id/reject', ownerOnly, rejectOperationalChange);

export default router;
