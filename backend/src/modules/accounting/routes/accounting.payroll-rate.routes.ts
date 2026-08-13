import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  getBaseMonthlyTerPreview,
  getEffectivePayrollRateProfile,
  getPayrollRateProfiles,
  getPpuStatutoryPreview,
} from '../controllers/accounting.payroll-rate-profile.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requireCapability('workforce.payroll.read'), getPayrollRateProfiles);
router.get('/effective', requireCapability('workforce.payroll.read'), getEffectivePayrollRateProfile);
router.get('/pph21/ter/monthly', requireCapability('workforce.payroll.read'), getBaseMonthlyTerPreview);
router.get('/statutory/ppu', requireCapability('workforce.payroll.read'), getPpuStatutoryPreview);

export default router;
