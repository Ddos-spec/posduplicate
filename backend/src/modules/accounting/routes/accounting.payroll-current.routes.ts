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
import {
  finalizePayrollOfficial,
  getPayrollAccountingSettings,
  getPayrollOfficialMaterializations,
  getPayrollOfficialPostings,
  materializePayrollOfficial,
  upsertPayrollAccountingSettings,
} from '../controllers/accounting.payroll-official.controller';
import { getPayrollCurrentContext } from '../controllers/accounting.payroll-current-context.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/context', requireCapability('workforce.payroll.read'), getPayrollCurrentContext);
router.get('/statutory-settings', requireCapability('workforce.payroll.read'), getPayrollStatutorySettings);
router.put('/statutory-settings/:employeeId', requireCapability('workforce.payroll.manage'), upsertPayrollStatutorySetting);
router.get('/accounting-settings', requireCapability('workforce.payroll.read'), getPayrollAccountingSettings);
router.put('/accounting-settings', requireCapability('workforce.payroll.manage'), upsertPayrollAccountingSettings);
router.get('/runs', requireCapability('workforce.payroll.read'), getPayrollCalculationRuns);
router.get('/activation-events', requireCapability('workforce.payroll.read'), getPayrollActivationEvents);
router.get('/official/materializations', requireCapability('workforce.payroll.read'), getPayrollOfficialMaterializations);
router.get('/official/postings', requireCapability('workforce.payroll.read'), getPayrollOfficialPostings);
router.post('/periods/:periodId/verify', requireCapability('workforce.payroll.manage'), runPayrollCurrentVerification);
router.post('/periods/:periodId/final-verify', requireCapability('workforce.payroll.manage'), runPayrollFinalVerification);
router.post('/periods/:periodId/materialize', requireCapability('workforce.payroll.manage'), materializePayrollOfficial);
router.post('/periods/:periodId/finalize-official', requireCapability('workforce.payroll.manage'), finalizePayrollOfficial);
router.post('/activate', requireCapability('workforce.payroll.manage'), activatePayrollProfileForTenant);

export default router;
