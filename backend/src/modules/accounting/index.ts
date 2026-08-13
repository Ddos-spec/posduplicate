import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requireCapability } from '../../middlewares/capability.middleware';
import accountingCoaRoutes from './routes/accounting.coa.routes';
import accountingJournalRoutes from './routes/accounting.journal.routes';
import accountingReportRoutes from './routes/accounting.report.routes';
import accountingAparRoutes from './routes/accounting.apar.routes';
import accountingPeriodRoutes from './routes/accounting.period.routes';
import accountingDashboardRoutes from './routes/accounting.dashboard.routes';
import accountingUserRoutes from './routes/accounting.user.routes';
import accountingLedgerRoutes from './routes/accounting.ledger.routes';
import accountingForecastRoutes from './routes/accounting.forecast.routes';
import accountingBudgetRoutes from './routes/accounting.budget.routes';
import accountingReconciliationRoutes from './routes/accounting.reconciliation.routes';
import accountingAssetRoutes from './routes/accounting.asset.routes';
import accountingTaxRoutes from './routes/accounting.tax.routes';
import accountingRolebasedRoutes from './routes/accounting.rolebased.routes';
import accountingSettingsRoutes from './routes/accounting.settings.routes';
import accountingAdvancedForecastRoutes from './routes/accounting.advanced-forecast.routes';
import accountingEfakturRoutes from './routes/accounting.efaktur.routes';
import accountingApprovalRoutes from './routes/accounting.approval.routes';
import accountingPsakRoutes from './routes/accounting.psak.routes';
import accountingAttachmentRoutes from './routes/accounting.attachment.routes';
import accountingPayrollRoutes from './routes/accounting.payroll.routes';
import accountingPayrollRateRoutes from './routes/accounting.payroll-rate.routes';
import { rejectLegacyPayrollMutation } from './controllers/accounting.payroll-rate-profile.controller';

const router = Router();

router.use('/coa', accountingCoaRoutes);
router.use('/journal', accountingJournalRoutes);
router.use('/reports', accountingReportRoutes);
router.use('/', accountingAparRoutes);
router.use('/periods', accountingPeriodRoutes);
router.use('/dashboard', accountingDashboardRoutes);
router.use('/users', accountingUserRoutes);
router.use('/ledger', accountingLedgerRoutes);
router.use('/forecast', accountingForecastRoutes);
router.use('/budgets', accountingBudgetRoutes);
router.use('/reconciliation', accountingReconciliationRoutes);
router.use('/assets', accountingAssetRoutes);
router.use('/tax', accountingTaxRoutes);
router.use('/dashboard/role', accountingRolebasedRoutes);
router.use('/settings', accountingSettingsRoutes);
router.use('/forecast/advanced', accountingAdvancedForecastRoutes);
router.use('/efaktur', accountingEfakturRoutes);
router.use('/approval', accountingApprovalRoutes);
router.use('/psak', accountingPsakRoutes);
router.use('/attachments', accountingAttachmentRoutes);
router.use('/payroll/rates', accountingPayrollRateRoutes);

// Temporary safety barrier: the legacy payroll controller still embeds stale TER/BPJS constants.
// Keep mutating payroll operations fail-closed until the verified current-law engine is wired end-to-end.
router.post(
  '/payroll/periods/:periodId/calculate',
  authMiddleware,
  tenantMiddleware,
  requireCapability('workforce.payroll.manage'),
  rejectLegacyPayrollMutation,
);
router.post(
  '/payroll/periods/:periodId/finalize',
  authMiddleware,
  tenantMiddleware,
  requireCapability('workforce.payroll.manage'),
  rejectLegacyPayrollMutation,
);

router.use('/payroll', accountingPayrollRoutes);

export default router;
