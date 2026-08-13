import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  getPayrollCalculationRuns,
  getPayrollStatutorySettings,
  runPayrollCurrentVerification,
  upsertPayrollStatutorySetting,
} from '../controllers/accounting.payroll-current.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/statutory-settings', requireCapability('workforce.payroll.read'), getPayrollStatutorySettings);
router.put('/statutory-settings/:employeeId', requireCapability('workforce.payroll.manage'), upsertPayrollStatutorySetting);
router.get('/runs', requireCapability('workforce.payroll.read'), getPayrollCalculationRuns);
router.post('/periods/:periodId/verify', requireCapability('workforce.payroll.manage'), runPayrollCurrentVerification);

export default router;
