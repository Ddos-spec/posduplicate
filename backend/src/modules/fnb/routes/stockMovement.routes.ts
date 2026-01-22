import { Router } from 'express';
import {
  getStockMovements,
  getStockMovement,
  createStockMovement,
  deleteStockMovement,
  getStockMovementSummary
} from '../controllers/stockMovement.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/stock-movements:
 *   get:
 *     tags: [Stock Movements]
 *     summary: Get stock movements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock movement list
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
router.get('/', getStockMovements);
/**
 * @swagger
 * /api/stock-movements/summary:
 *   get:
 *     tags: [Stock Movements]
 *     summary: Get stock movement summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock movement summary
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
router.get('/summary', getStockMovementSummary);
/**
 * @swagger
 * /api/stock-movements/{id}:
 *   get:
 *     tags: [Stock Movements]
 *     summary: Get stock movement by ID
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
 *         description: Stock movement detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Stock movement not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getStockMovement);
/**
 * @swagger
 * /api/stock-movements:
 *   post:
 *     tags: [Stock Movements]
 *     summary: Create stock movement
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
 *         description: Stock movement created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createStockMovement);
/**
 * @swagger
 * /api/stock-movements/{id}:
 *   delete:
 *     tags: [Stock Movements]
 *     summary: Delete stock movement
 *     description: Owner/Manager only with rollback
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
 *         description: Stock movement deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', ownerOnly, deleteStockMovement); // Only Owner/Manager can delete with rollback

export default router;
