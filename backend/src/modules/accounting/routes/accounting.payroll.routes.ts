import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  // Employee management
  getEmployees,
  upsertEmployee,
  // Payroll processing
  getPayrollPeriods,
  createPayrollPeriod,
  calculatePayroll,
  getPayrollDetails,
  finalizePayroll,
  generatePayslip,
  // THR
  calculateTHR,
  // Overtime
  recordOvertime,
  // Reports
  getPayrollReport,
  getPPh21Report
} from '../controllers/accounting.payroll.controller';

const router = Router();

// Apply auth and tenant middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ============= EMPLOYEE MANAGEMENT =============
router.get('/employees', getEmployees);
router.post('/employees', upsertEmployee);
router.put('/employees/:id', upsertEmployee);

// ============= PAYROLL PERIODS =============
router.get('/periods', getPayrollPeriods);
router.post('/periods', createPayrollPeriod);

// ============= PAYROLL PROCESSING =============
router.post('/periods/:periodId/calculate', calculatePayroll);
router.get('/periods/:periodId/details', getPayrollDetails);
router.post('/periods/:periodId/finalize', finalizePayroll);

// ============= PAYSLIP =============
router.get('/periods/:periodId/payslip/:employeeId', generatePayslip);

// ============= THR =============
router.post('/thr/calculate', calculateTHR);

// ============= OVERTIME =============
router.post('/overtime', recordOvertime);

// ============= REPORTS =============
router.get('/reports/summary', getPayrollReport);
router.get('/reports/pph21', getPPh21Report);

export default router;
