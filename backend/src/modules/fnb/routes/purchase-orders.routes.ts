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
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';

const router = Router();

// Procurement is operationally sensitive: every endpoint requires an authenticated tenant context.
router.use(authMiddleware, tenantMiddleware);

router.get('/suggestions', requireCapability('supply.procurement.read'), getPOSuggestions);
router.get('/', requireCapability('supply.procurement.read'), getAllPurchaseOrders);
router.get('/:id', requireCapability('supply.procurement.read'), getPurchaseOrderById);
router.post('/', requireCapability('supply.procurement.manage'), createPurchaseOrder);
router.put('/:id', requireCapability('supply.procurement.manage'), updatePurchaseOrder);
router.patch('/:id/status', requireCapability('supply.procurement.manage'), updatePOStatus);
router.post('/:id/receive', requireCapability('supply.procurement.manage'), receivePOItemsWithWarehouse);
router.delete('/:id', requireCapability('supply.procurement.manage'), deletePurchaseOrder);

export default router;
