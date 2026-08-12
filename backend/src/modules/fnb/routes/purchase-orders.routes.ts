import { Router } from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePOStatus,
  deletePurchaseOrder,
  getPOSuggestions
} from '../controllers/purchase-orders.p1.controller';
import { receivePOItemsWithWarehouse } from '../controllers/procurement-receiving.p1.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// Procurement is operationally sensitive: every endpoint requires an authenticated tenant context.
router.use(authMiddleware, tenantMiddleware);

router.get('/suggestions', getPOSuggestions);
router.get('/', getAllPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.post('/', ownerOnly, createPurchaseOrder);
router.put('/:id', ownerOnly, updatePurchaseOrder);
router.patch('/:id/status', ownerOnly, updatePOStatus);
router.post('/:id/receive', ownerOnly, receivePOItemsWithWarehouse);
router.delete('/:id', ownerOnly, deletePurchaseOrder);

export default router;
