import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { roleMiddleware } from '../../../middlewares/auth.middleware';
import {
  createTeamMember,
  deleteTeamMember,
  getMcsModules,
  listTeam,
  updateTeamMember,
} from '../controllers/mcsTeam.controller';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware(['owner', 'manager']));

router.get('/modules', getMcsModules);
router.get('/', listTeam);
router.post('/', createTeamMember);
router.put('/:memberId', updateTeamMember);
router.delete('/:memberId', deleteTeamMember);

export default router;
