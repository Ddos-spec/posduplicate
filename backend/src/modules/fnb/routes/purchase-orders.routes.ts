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
} from '../controllers/purchase-orders.p1.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// Procurement is operationally sensitive: every endpoint requires an authenticated tenant context.
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/purchase-orders/suggestions:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get tenant-scoped purchase order suggestions
 */
router.get('/suggestions', getPOSuggestions);

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get tenant-scoped purchase orders
 */
router.get('/', getAllPurchaseOrders);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     tags: [Purchase Orders]
 *     summary: Get purchase order by ID
 */
router.get('/:id', getPurchaseOrderById);

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Create purchase order
 */
router.post('/', ownerOnly, createPurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     tags: [Purchase Orders]
 *     summary: Update purchase order
 */
router.put('/:id', ownerOnly, updatePurchaseOrder);

/**
 * @swagger
 * /api/purchase-orders/{id}/status:
 *   patch:
 *     tags: [Purchase Orders]
 *     summary: Transition purchase order status
 */
router.patch('/:id/status', ownerOnly, updatePOStatus);

/**
 * @swagger
 * /api/purchase-orders/{id}/receive:
 *   post:
 *     tags: [Purchase Orders]
 *     summary: Receive purchase order items atomically and post stock ledger movements
 */
router.post('/:id/receive', ownerOnly, receivePOItems);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   delete:
 *     tags: [Purchase Orders]
 *     summary: Delete draft purchase order
 */
router.delete('/:id', ownerOnly, deletePurchaseOrder);

export default router;
