import { Router } from 'express';
import {
  getInventory,
  adjustStock,
  getLowStock
} from '../controllers/inventory.controller';
import { getStockMovements } from '../controllers/stockMovement.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory items
 *     description: Retrieve inventory items with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: boolean
 *         description: Filter items that are low in stock
 *     responses:
 *       200:
 *         description: Inventory list
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
router.get('/', getInventory);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     tags: [Inventory]
 *     summary: Get low stock items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Low stock items
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
router.get('/low-stock', getLowStock);
// Consolidated: use stockMovement controller as single source of truth
/**
 * @swagger
 * /api/inventory/movements:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory stock movements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: item_id
 *         schema:
 *           type: integer
 *         description: Filter by item ID
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
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
router.get('/movements', getStockMovements);
/**
 * @swagger
 * /api/inventory/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Adjust inventory stock
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - quantity
 *               - type
 *               - reason
 *             properties:
 *               itemId:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               type:
 *                 type: string
 *                 description: Stock adjustment type (in/out)
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/adjust', adjustStock);

export default router;
