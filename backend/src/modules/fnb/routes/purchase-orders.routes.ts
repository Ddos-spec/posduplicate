import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import {
  requireTenantContext,
  tenantMiddleware,
  tenantOutletScopeMiddleware
} from '../../../middlewares/tenant.middleware';
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
import { requireCapability } from '../../../middlewares/capability.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware, requireTenantContext, tenantOutletScopeMiddleware);

router.get('/suggestions', requireCapability('supply.procurement.read'), getPOSuggestions);
router.get('/', requireCapability('supply.procurement.read'), getAllPurchaseOrders);
router.get('/:id', requireCapability('supply.procurement.read'), getPurchaseOrderById);
router.post('/', requireCapability('supply.procurement.manage'), createPurchaseOrder);
router.put('/:id', requireCapability('supply.procurement.manage'), updatePurchaseOrder);
router.patch('/:id/status', requireCapability('supply.procurement.manage'), updatePOStatus);
router.post('/:id/receive', requireCapability('supply.procurement.manage'), receivePOItemsWithWarehouse);
router.delete('/:id', requireCapability('supply.procurement.manage'), deletePurchaseOrder);

export default router;
