import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as budgetController from '../controllers/accounting.budget.controller';

const router = Router();

// Budget CRUD
/**
 * @swagger
 * /api/accounting/budgets:
 *   get:
 *     tags: [Accounting]
 *     summary: Get budgets
 *     responses:
 *       200:
 *         description: Budget list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', budgetController.getBudgets);
/**
 * @swagger
 * /api/accounting/budgets/vs-actual:
 *   get:
 *     tags: [Accounting]
 *     summary: Get budget vs actual report
 *     responses:
 *       200:
 *         description: Budget vs actual data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/vs-actual', budgetController.getBudgetVsActual);
/**
 * @swagger
 * /api/accounting/budgets/{id}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get budget by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Budget detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/:id', budgetController.getBudgetById);
/**
 * @swagger
 * /api/accounting/budgets:
 *   post:
 *     tags: [Accounting]
 *     summary: Create budget
 *     description: Owner/Manager/Super Admin only
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
 *         description: Budget created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', roleMiddleware(['Owner', 'Super Admin', 'Manager']), budgetController.createBudget);
/**
 * @swagger
 * /api/accounting/budgets/{id}:
 *   patch:
 *     tags: [Accounting]
 *     summary: Update budget
 *     description: Owner/Manager/Super Admin only
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
 *         description: Budget updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin', 'Manager']), budgetController.updateBudget);
/**
 * @swagger
 * /api/accounting/budgets/{id}:
 *   delete:
 *     tags: [Accounting]
 *     summary: Delete budget
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Budget deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', roleMiddleware(['Owner', 'Super Admin']), budgetController.deleteBudget);

export default router;
