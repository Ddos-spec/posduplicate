import { Router, type Request, type Response, type NextFunction } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  createTeamMember,
  deleteTeamMember,
  getMcsModules,
  listTeam,
  updateTeamMember,
} from '../controllers/mcsTeam.controller';

const router = Router();

function mcsOwnerAccess(req: Request, res: Response, next: NextFunction) {
  const role = (req.userRole || '').toLowerCase().trim();
  if (role === 'super_admin' || role === 'owner' || role === 'manager') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Hanya Owner atau Manager yang dapat mengelola tim MCS.' },
  });
}

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(mcsOwnerAccess);

router.get('/modules', getMcsModules);
router.get('/', listTeam);
router.post('/', createTeamMember);
router.put('/:memberId', updateTeamMember);
router.delete('/:memberId', deleteTeamMember);

export default router;
