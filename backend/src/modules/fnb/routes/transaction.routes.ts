import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  holdOrder,
  getHeldOrders,
  updateTransactionStatus,
  deleteTransaction,
  getTodayReport
} from '../controllers/transaction.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { validateCreateTransaction, validateIdParam } from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: Get all transactions
 *     description: Get transactions with role-based filtering (Owner/Manager see all, Cashier sees own)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled, hold]
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/', getTransactions);

/**
 * @swagger
 * /api/transactions/today-report:
 *   get:
 *     tags: [Transactions]
 *     summary: Get today's sales report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's report
 */
router.get('/today-report', getTodayReport);

/**
 * @swagger
 * /api/transactions/held:
 *   get:
 *     tags: [Transactions]
 *     summary: Get held orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of held orders
 */
router.get('/held', getHeldOrders);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transaction by ID
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
 *         description: Transaction details
 */
router.get('/:id', validateIdParam, getTransactionById);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Create new transaction (checkout)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - paymentMethod
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               orderType:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               total:
 *                 type: number
 *     responses:
 *       201:
 *         description: Transaction created
 */
router.post('/', validateCreateTransaction, createTransaction);

/**
 * @swagger
 * /api/transactions/hold:
 *   post:
 *     tags: [Transactions]
 *     summary: Hold order for later
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order held
 */
router.post('/hold', holdOrder);

/**
 * @swagger
 * /api/transactions/{id}/status:
 *   put:
 *     tags: [Transactions]
 *     summary: Update transaction status
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
 *         description: Status updated
 */
router.put('/:id/status', validateIdParam, updateTransactionStatus);

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     tags: [Transactions]
 *     summary: Delete transaction
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
 *         description: Transaction deleted
 */
router.delete('/:id', validateIdParam, deleteTransaction);

export default router;
