import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { requireTenantContext, tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
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
router.use(tenantMiddleware, requireTenantContext);

// ============= EMPLOYEE MANAGEMENT =============
/**
 * @swagger
 * /api/accounting/payroll/employees:
 *   get:
 *     tags: [Accounting]
 *     summary: Get employees
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/employees', requireCapability('workforce.employee.read'), getEmployees);
/**
 * @swagger
 * /api/accounting/payroll/employees:
 *   post:
 *     tags: [Accounting]
 *     summary: Create or update employee
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Employee upserted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/employees', requireCapability('workforce.employee.manage'), upsertEmployee);
/**
 * @swagger
 * /api/accounting/payroll/employees/{id}:
 *   put:
 *     tags: [Accounting]
 *     summary: Update employee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Employee updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/employees/:id', requireCapability('workforce.employee.manage'), upsertEmployee);

// ============= PAYROLL PERIODS =============
/**
 * @swagger
 * /api/accounting/payroll/periods:
 *   get:
 *     tags: [Accounting]
 *     summary: Get payroll periods
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payroll period list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/periods', requireCapability('workforce.payroll.read'), getPayrollPeriods);
/**
 * @swagger
 * /api/accounting/payroll/periods:
 *   post:
 *     tags: [Accounting]
 *     summary: Create payroll period
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Payroll period created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/periods', requireCapability('workforce.payroll.manage'), createPayrollPeriod);

// ============= PAYROLL PROCESSING =============
/**
 * @swagger
 * /api/accounting/payroll/periods/{periodId}/calculate:
 *   post:
 *     tags: [Accounting]
 *     summary: Calculate payroll for period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: periodId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payroll calculated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/periods/:periodId/calculate', requireCapability('workforce.payroll.manage'), calculatePayroll);
/**
 * @swagger
 * /api/accounting/payroll/periods/{periodId}/details:
 *   get:
 *     tags: [Accounting]
 *     summary: Get payroll details for period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: periodId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payroll details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/periods/:periodId/details', requireCapability('workforce.payroll.read'), getPayrollDetails);
/**
 * @swagger
 * /api/accounting/payroll/periods/{periodId}/finalize:
 *   post:
 *     tags: [Accounting]
 *     summary: Finalize payroll period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: periodId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payroll period finalized
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/periods/:periodId/finalize', requireCapability('workforce.payroll.manage'), finalizePayroll);

// ============= PAYSLIP =============
/**
 * @swagger
 * /api/accounting/payroll/periods/{periodId}/payslip/{employeeId}:
 *   get:
 *     tags: [Accounting]
 *     summary: Generate payslip
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: periodId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payslip generated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/periods/:periodId/payslip/:employeeId', requireCapability('workforce.payroll.read'), generatePayslip);

// ============= THR =============
/**
 * @swagger
 * /api/accounting/payroll/thr/calculate:
 *   post:
 *     tags: [Accounting]
 *     summary: Calculate THR
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: THR calculated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/thr/calculate', requireCapability('workforce.payroll.manage'), calculateTHR);

// ============= OVERTIME =============
/**
 * @swagger
 * /api/accounting/payroll/overtime:
 *   post:
 *     tags: [Accounting]
 *     summary: Record overtime
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Overtime recorded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/overtime', requireCapability('workforce.payroll.manage'), recordOvertime);

// ============= REPORTS =============
/**
 * @swagger
 * /api/accounting/payroll/reports/summary:
 *   get:
 *     tags: [Accounting]
 *     summary: Get payroll summary report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payroll summary report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/reports/summary', requireCapability('workforce.payroll.read'), getPayrollReport);
/**
 * @swagger
 * /api/accounting/payroll/reports/pph21:
 *   get:
 *     tags: [Accounting]
 *     summary: Get PPh21 report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PPh21 report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/reports/pph21', requireCapability('workforce.payroll.read'), getPPh21Report);

export default router;
