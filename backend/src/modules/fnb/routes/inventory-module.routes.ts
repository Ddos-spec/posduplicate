import { Router } from 'express';
import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getLowStockItems,
  getInventoryCategories,
  adjustInventoryStock,
  getInventoryStats,
  getInventoryAlerts,
  generateAlerts,
  resolveAlert,
  getInventoryForecast
} from '../controllers/inventory-module.controller';

const router = Router();

// Dashboard & Stats
/**
 * @swagger
 * /api/inventory-module/stats:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory module stats
 *     responses:
 *       200:
 *         description: Inventory statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/stats', getInventoryStats);

// Alerts
/**
 * @swagger
 * /api/inventory-module/alerts:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory alerts
 *     responses:
 *       200:
 *         description: Inventory alerts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/alerts', getInventoryAlerts);
/**
 * @swagger
 * /api/inventory-module/alerts/generate:
 *   post:
 *     tags: [Inventory]
 *     summary: Generate inventory alerts
 *     responses:
 *       200:
 *         description: Alerts generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/alerts/generate', generateAlerts);
/**
 * @swagger
 * /api/inventory-module/alerts/{id}/resolve:
 *   put:
 *     tags: [Inventory]
 *     summary: Resolve inventory alert
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.put('/alerts/:id/resolve', resolveAlert);

// Forecast
/**
 * @swagger
 * /api/inventory-module/forecast:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory forecast
 *     responses:
 *       200:
 *         description: Inventory forecast
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/forecast', getInventoryForecast);

// Get all inventory items
/**
 * @swagger
 * /api/inventory-module:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory items (advanced module)
 *     responses:
 *       200:
 *         description: Inventory items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', getAllInventory);

// Get low stock items
/**
 * @swagger
 * /api/inventory-module/low-stock:
 *   get:
 *     tags: [Inventory]
 *     summary: Get low stock inventory items
 *     responses:
 *       200:
 *         description: Low stock items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/low-stock', getLowStockItems);

// Get inventory categories
/**
 * @swagger
 * /api/inventory-module/categories:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory categories
 *     responses:
 *       200:
 *         description: Inventory categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/categories', getInventoryCategories);

// Get single inventory item
/**
 * @swagger
 * /api/inventory-module/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory item by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Inventory item detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/:id', getInventoryById);

// Create new inventory item
/**
 * @swagger
 * /api/inventory-module:
 *   post:
 *     tags: [Inventory]
 *     summary: Create inventory item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Inventory item created
 */
router.post('/', createInventory);

// Update inventory item
/**
 * @swagger
 * /api/inventory-module/{id}:
 *   put:
 *     tags: [Inventory]
 *     summary: Update inventory item
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
 *         description: Inventory item updated
 */
router.put('/:id', updateInventory);

// Delete inventory item
/**
 * @swagger
 * /api/inventory-module/{id}:
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete inventory item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Inventory item deleted
 */
router.delete('/:id', deleteInventory);

// Adjust stock
/**
 * @swagger
 * /api/inventory-module/{id}/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Adjust inventory stock
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
 *             properties:
 *               quantity:
 *                 type: number
 *               type:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted
 */
router.post('/:id/adjust', adjustInventoryStock);

export default router;
