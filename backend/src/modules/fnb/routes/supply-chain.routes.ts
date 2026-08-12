import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';
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

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/summary', getSupplyChainSummary);
router.post('/warehouse/bootstrap', ownerOnly, bootstrapWarehouse);
router.get('/warehouse/locations', getWarehouseLocations);
router.post('/warehouse/locations', ownerOnly, createWarehouseLocation);
router.get('/warehouse/balances', getWarehouseBalances);
router.get('/warehouse/transfers', getStockTransfers);
router.post('/warehouse/transfers', ownerOnly, createStockTransfer);
router.post('/warehouse/transfers/:id/execute', ownerOnly, executeStockTransfer);
router.get('/warehouse/counts', getStockCounts);
router.post('/warehouse/counts', ownerOnly, createStockCount);
router.post('/warehouse/counts/:id/finalize', ownerOnly, finalizeStockCount);

router.post('/barcode', ownerOnly, createBarcodeAlias);
router.get('/barcode/:barcode', resolveBarcode);

router.get('/manufacturing/orders', getManufacturingOrders);
router.post('/manufacturing/orders', ownerOnly, createManufacturingOrder);
router.post('/manufacturing/orders/:id/transition', ownerOnly, transitionManufacturingOrder);
router.post('/manufacturing/orders/:id/complete', ownerOnly, completeManufacturingOrder);

router.get('/quality/checks', getQualityChecks);
router.post('/quality/checks', ownerOnly, createQualityCheck);
router.post('/quality/checks/:id/resolve', ownerOnly, resolveQualityCheck);

router.get('/maintenance/equipment', getEquipment);
router.post('/maintenance/equipment', ownerOnly, createEquipment);
router.get('/maintenance/requests', getMaintenanceRequests);
router.post('/maintenance/requests', ownerOnly, createMaintenanceRequest);
router.post('/maintenance/requests/:id/status', ownerOnly, updateMaintenanceRequest);

export default router;
