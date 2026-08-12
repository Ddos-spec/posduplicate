import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import { getEffectivePayrollRateProfile, getPayrollRateProfiles } from '../controllers/accounting.payroll-rate-profile.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requireCapability('workforce.payroll.read'), getPayrollRateProfiles);
router.get('/effective', requireCapability('workforce.payroll.read'), getEffectivePayrollRateProfile);

export default router;
