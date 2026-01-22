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
router.get('/employees', getEmployees);
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
router.post('/employees', upsertEmployee);
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
router.put('/employees/:id', upsertEmployee);

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
router.get('/periods', getPayrollPeriods);
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
router.post('/periods', createPayrollPeriod);

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
router.post('/periods/:periodId/calculate', calculatePayroll);
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
router.get('/periods/:periodId/details', getPayrollDetails);
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
router.post('/periods/:periodId/finalize', finalizePayroll);

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
router.get('/periods/:periodId/payslip/:employeeId', generatePayslip);

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
router.post('/thr/calculate', calculateTHR);

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
router.post('/overtime', recordOvertime);

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
router.get('/reports/summary', getPayrollReport);
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
router.get('/reports/pph21', getPPh21Report);

export default router;
