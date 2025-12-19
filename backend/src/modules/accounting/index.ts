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

export default router;
