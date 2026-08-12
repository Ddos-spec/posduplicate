import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  bootstrapWarehouse,
  createBarcodeAlias,
  createStockCount,
  createStockTransfer,
  createWarehouseLocation,
  executeStockTransfer,
  finalizeStockCount,
  getStockCounts,
  getStockTransfers,
  getSupplyChainSummary,
  getWarehouseBalances,
  getWarehouseLocations,
  resolveBarcode,
} from '../controllers/warehouse.p1.controller';
import {
  completeManufacturingOrder,
  createManufacturingOrder,
  getManufacturingOrders,
  transitionManufacturingOrder,
} from '../controllers/manufacturing.p1.controller';
import {
  createEquipment,
  createMaintenanceRequest,
  createQualityCheck,
  getEquipment,
  getMaintenanceRequests,
  getQualityChecks,
  resolveQualityCheck,
  updateMaintenanceRequest,
} from '../controllers/quality-maintenance.p1.controller';
import {
  convertRfqToPurchaseOrder,
  createPurchaseRfq,
  getPurchaseRfqs,
  selectRfqSupplier,
  sendPurchaseRfq,
  submitSupplierRfqQuote,
} from '../controllers/procurement-rfq.p1.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/summary', requireCapability('supply.warehouse.read'), getSupplyChainSummary);

router.get('/procurement/rfqs', requireCapability('supply.procurement.read'), getPurchaseRfqs);
router.post('/procurement/rfqs', requireCapability('supply.procurement.manage'), createPurchaseRfq);
router.post('/procurement/rfqs/:id/send', requireCapability('supply.procurement.manage'), sendPurchaseRfq);
router.post('/procurement/rfqs/:id/suppliers/:supplierId/quote', requireCapability('supply.procurement.manage'), submitSupplierRfqQuote);
router.post('/procurement/rfqs/:id/select', requireCapability('supply.procurement.manage'), selectRfqSupplier);
router.post('/procurement/rfqs/:id/convert', requireCapability('supply.procurement.manage'), convertRfqToPurchaseOrder);

router.post('/warehouse/bootstrap', requireCapability('supply.warehouse.manage'), bootstrapWarehouse);
router.get('/warehouse/locations', requireCapability('supply.warehouse.read'), getWarehouseLocations);
router.post('/warehouse/locations', requireCapability('supply.warehouse.manage'), createWarehouseLocation);
router.get('/warehouse/balances', requireCapability('supply.warehouse.read'), getWarehouseBalances);
router.get('/warehouse/transfers', requireCapability('supply.warehouse.read'), getStockTransfers);
router.post('/warehouse/transfers', requireCapability('supply.warehouse.manage'), createStockTransfer);
router.post('/warehouse/transfers/:id/execute', requireCapability('supply.warehouse.manage'), executeStockTransfer);
router.get('/warehouse/counts', requireCapability('supply.warehouse.read'), getStockCounts);
router.post('/warehouse/counts', requireCapability('supply.warehouse.manage'), createStockCount);
router.post('/warehouse/counts/:id/finalize', requireCapability('supply.warehouse.manage'), finalizeStockCount);

router.post('/barcode', requireCapability('supply.barcode.manage'), createBarcodeAlias);
router.get('/barcode/:barcode', requireCapability('supply.barcode.read'), resolveBarcode);

router.get('/manufacturing/orders', requireCapability('supply.manufacturing.read'), getManufacturingOrders);
router.post('/manufacturing/orders', requireCapability('supply.manufacturing.manage'), createManufacturingOrder);
router.post('/manufacturing/orders/:id/transition', requireCapability('supply.manufacturing.manage'), transitionManufacturingOrder);
router.post('/manufacturing/orders/:id/complete', requireCapability('supply.manufacturing.manage'), completeManufacturingOrder);

router.get('/quality/checks', requireCapability('supply.quality.read'), getQualityChecks);
router.post('/quality/checks', requireCapability('supply.quality.manage'), createQualityCheck);
router.post('/quality/checks/:id/resolve', requireCapability('supply.quality.manage'), resolveQualityCheck);

router.get('/maintenance/equipment', requireCapability('supply.maintenance.read'), getEquipment);
router.post('/maintenance/equipment', requireCapability('supply.maintenance.manage'), createEquipment);
router.get('/maintenance/requests', requireCapability('supply.maintenance.read'), getMaintenanceRequests);
router.post('/maintenance/requests', requireCapability('supply.maintenance.manage'), createMaintenanceRequest);
router.post('/maintenance/requests/:id/status', requireCapability('supply.maintenance.manage'), updateMaintenanceRequest);

export default router;
