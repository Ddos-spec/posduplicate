import { Router } from 'express';
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
// Advanced modules
import accountingRolebasedRoutes from './routes/accounting.rolebased.routes';
import accountingSettingsRoutes from './routes/accounting.settings.routes';
import accountingAdvancedForecastRoutes from './routes/accounting.advanced-forecast.routes';
// Enterprise modules (101/100 vs Accurate)
import accountingEfakturRoutes from './routes/accounting.efaktur.routes';
import accountingApprovalRoutes from './routes/accounting.approval.routes';
import accountingPsakRoutes from './routes/accounting.psak.routes';

const router = Router();

// Accounting Routes
router.use('/coa', accountingCoaRoutes);
router.use('/journal', accountingJournalRoutes);
router.use('/reports', accountingReportRoutes);
router.use('/', accountingAparRoutes); // Mounts at /accounting/ap and /accounting/ar
router.use('/periods', accountingPeriodRoutes);
router.use('/dashboard', accountingDashboardRoutes);
router.use('/users', accountingUserRoutes);
router.use('/ledger', accountingLedgerRoutes);
router.use('/forecast', accountingForecastRoutes);
router.use('/budgets', accountingBudgetRoutes);
router.use('/reconciliation', accountingReconciliationRoutes);
router.use('/assets', accountingAssetRoutes);
router.use('/tax', accountingTaxRoutes);

// Advanced Modules
router.use('/dashboard/role', accountingRolebasedRoutes);  // Role-based dashboards
router.use('/settings', accountingSettingsRoutes);          // Comprehensive settings
router.use('/forecast/advanced', accountingAdvancedForecastRoutes); // Advanced forecasting

// Enterprise Modules (101/100 vs Accurate)
router.use('/efaktur', accountingEfakturRoutes);            // e-Faktur PPN/PPh integration
router.use('/approval', accountingApprovalRoutes);          // Multi-level approval workflow
router.use('/psak', accountingPsakRoutes);                  // PSAK-compliant reports

export default router;
