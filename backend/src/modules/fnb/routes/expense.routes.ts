import { Router } from 'express';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseCategories
} from '../controllers/expense.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expenses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense list
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
router.get('/', getExpenses);
/**
 * @swagger
 * /api/expenses/summary:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense summary
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
router.get('/summary', getExpenseSummary);
/**
 * @swagger
 * /api/expenses/categories:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense categories
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
router.get('/categories', getExpenseCategories);
/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get expense by ID
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
 *         description: Expense detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getExpense);
/**
 * @swagger
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Create expense
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - category
 *             properties:
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               outletId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Expense created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createExpense);
/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     tags: [Expenses]
 *     summary: Update expense
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
 *         description: Expense updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateExpense);
/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete expense
 *     description: Owner/Manager only
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
 *         description: Expense deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', ownerOnly, deleteExpense); // Only Owner/Manager can delete (requires reason)

export default router;
