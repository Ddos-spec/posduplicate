import { Router } from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePOStatus,
  receivePOItems,
  deletePurchaseOrder,
  getPOSuggestions
} from '../controllers/purchase-orders.controller';

const router = Router();

// Get PO suggestions (must be before /:id)
/**
 * @swagger
 * /api/purchase-orders/suggestions:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get purchase order suggestions
 *     responses:
 *       200:
 *         description: Purchase order suggestions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/suggestions', getPOSuggestions);

// Get all purchase orders
/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get all purchase orders
 *     responses:
 *       200:
 *         description: Purchase order list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', getAllPurchaseOrders);

// Get single purchase order
/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get purchase order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Purchase order detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/:id', getPurchaseOrderById);

// Create purchase order
/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Create purchase order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Purchase order created
 */
router.post('/', createPurchaseOrder);

// Update purchase order
/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     tags: [Purchase Orders]
 *     summary: Update purchase order
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
 *         description: Purchase order updated
 */
router.put('/:id', updatePurchaseOrder);

// Update PO status
/**
 * @swagger
 * /api/purchase-orders/{id}/status:
 *   patch:
 *     tags: [Purchase Orders]
 *     summary: Update purchase order status
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
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Purchase order status updated
 */
router.patch('/:id/status', updatePOStatus);

// Receive PO items
/**
 * @swagger
 * /api/purchase-orders/{id}/receive:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Receive purchase order items
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
 *         description: Purchase order received
 */
router.post('/:id/receive', receivePOItems);

// Delete purchase order
/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     tags: [Purchase Orders]
 *     summary: Delete purchase order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Purchase order deleted
 */
router.delete('/:id', deletePurchaseOrder);

export default router;
