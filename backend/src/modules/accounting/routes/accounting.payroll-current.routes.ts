import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  activatePayrollProfileForTenant,
  getPayrollActivationEvents,
  getPayrollCalculationRuns,
  getPayrollStatutorySettings,
  runPayrollCurrentVerification,
  runPayrollFinalVerification,
  upsertPayrollStatutorySetting,
} from '../controllers/accounting.payroll-current.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/statutory-settings', requireCapability('workforce.payroll.read'), getPayrollStatutorySettings);
router.put('/statutory-settings/:employeeId', requireCapability('workforce.payroll.manage'), upsertPayrollStatutorySetting);
router.get('/runs', requireCapability('workforce.payroll.read'), getPayrollCalculationRuns);
router.get('/activation-events', requireCapability('workforce.payroll.read'), getPayrollActivationEvents);
router.post('/periods/:periodId/verify', requireCapability('workforce.payroll.manage'), runPayrollCurrentVerification);
router.post('/periods/:periodId/final-verify', requireCapability('workforce.payroll.manage'), runPayrollFinalVerification);
router.post('/activate', requireCapability('workforce.payroll.manage'), activatePayrollProfileForTenant);

export default router;
