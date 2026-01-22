import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as coaController from '../controllers/accounting.coa.controller';

const router = express.Router();

// Middleware Stack
// 1. Authenticate (JWT)
// 2. Attach User/Tenant Context
// 3. Audit Logging (for mutations)
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

// Routes
/**
 * @swagger
 * /api/accounting/coa:
 *   get:
 *     tags: [Accounting]
 *     summary: Get chart of accounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart of accounts list
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
router.get('/', coaController.getCoA);
/**
 * @swagger
 * /api/accounting/coa:
 *   post:
 *     tags: [Accounting]
 *     summary: Create account in chart of accounts
 *     description: Owner/Super Admin only
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
 *         description: Account created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', roleMiddleware(['Owner', 'Super Admin']), coaController.createAccount);
/**
 * @swagger
 * /api/accounting/coa/seed:
 *   post:
 *     tags: [Accounting]
 *     summary: Seed chart of accounts
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart of accounts seeded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/seed', roleMiddleware(['Owner', 'Super Admin']), coaController.seedCoA);
/**
 * @swagger
 * /api/accounting/coa/{id}:
 *   patch:
 *     tags: [Accounting]
 *     summary: Update chart of accounts entry
 *     description: Owner/Super Admin only
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
 *         description: Account updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin']), coaController.updateAccount);

export default router;
