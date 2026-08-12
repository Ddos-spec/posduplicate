import api from './api';

export type SupplyChainTab = 'procurement' | 'warehouse' | 'barcode' | 'manufacturing' | 'quality' | 'maintenance';

export interface OutletLite { id: number; name: string; }
export interface WarehouseLocation { id: number; outlet_id: number; outlet_name?: string; code: string; name: string; location_type: string; }
export interface WarehouseBalance { id: number; outlet_id: number; outlet_name?: string; location_id: number; location_code: string; location_name: string; inventory_id: number; inventory_name: string; sku?: string | null; unit: string; quantity: number | string; aggregate_stock: number | string; }
export interface StockTransfer { id: number; transfer_number: string; outlet_id: number; source_location_id: number; destination_location_id: number; source_code: string; destination_code: string; status: string; created_at: string; lines: Array<{ id: number; inventoryId: number; inventoryName: string; sku?: string | null; quantityRequested: number | string; quantityDone: number | string }>; }
export interface StockCount { id: number; count_number: string; location_id: number; location_code: string; location_name: string; status: string; created_at: string; lines: Array<{ id: number; inventoryId: number; inventoryName: string; expectedQuantity: number | string; countedQuantity: number | string | null; varianceQuantity: number | string | null }>; }
export interface ManufacturingOrder { id: number; mo_number: string; outlet_id: number; item_id: number; item_name?: string; quantity_planned: number | string; quantity_produced: number | string; status: string; created_at: string; consumptions: Array<{ id: number; ingredientId?: number | null; inventoryId?: number | null; ingredientName?: string | null; inventoryName?: string | null; quantityPlanned: number | string; quantityConsumed: number | string; unitCost: number | string }>; }
export interface QualityCheck { id: number; outlet_id: number; outlet_name?: string; check_type: string; reference_type?: string | null; reference_id?: string | null; inventory_name?: string | null; item_name?: string | null; status: string; notes?: string | null; created_at: string; }
export interface Equipment { id: number; outlet_id: number; outlet_name?: string; code: string; name: string; category?: string | null; status: string; next_maintenance_at?: string | null; open_requests?: number; }
export interface MaintenanceRequest { id: number; equipment_id: number; equipment_code: string; equipment_name: string; priority: string; request_type: string; title: string; status: string; scheduled_at?: string | null; created_at: string; }
export interface PurchaseOrder { id: number; po_number: string; outlet_id: number; supplier_id?: number | null; status: string; total: number | string; expected_date?: string | null; suppliers?: { id: number; name: string } | null; purchase_order_items: Array<{ id: number; inventory_id: number; quantity: number | string; received_qty: number | string; unit: string; unit_price: number | string; inventory?: { id: number; name: string; sku?: string | null; unit: string; current_stock?: number | string } | null }>; }
export interface ProductLite { id: number; name: string; outlet_id: number; track_stock?: boolean; stock?: number | string; }

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export async function getSupplySummary() { return unwrap<any>(await api.get('/supply-chain/summary')); }
export async function bootstrapWarehouse() { return unwrap<any>(await api.post('/supply-chain/warehouse/bootstrap')); }
export async function getOutlets(): Promise<OutletLite[]> { return unwrap<OutletLite[]>(await api.get('/outlets')); }
export async function getLocations(): Promise<WarehouseLocation[]> { return unwrap<WarehouseLocation[]>(await api.get('/supply-chain/warehouse/locations')); }
export async function getBalances(): Promise<WarehouseBalance[]> { return unwrap<WarehouseBalance[]>(await api.get('/supply-chain/warehouse/balances')); }
export async function getTransfers(): Promise<StockTransfer[]> { return unwrap<StockTransfer[]>(await api.get('/supply-chain/warehouse/transfers')); }
export async function createTransfer(payload: { outletId: number; sourceLocationId: number; destinationLocationId: number; inventoryId: number; quantity: number; notes?: string }) {
  return unwrap<StockTransfer>(await api.post('/supply-chain/warehouse/transfers', { outletId: payload.outletId, sourceLocationId: payload.sourceLocationId, destinationLocationId: payload.destinationLocationId, notes: payload.notes, lines: [{ inventoryId: payload.inventoryId, quantity: payload.quantity }] }));
}
export async function executeTransfer(id: number) { return unwrap<StockTransfer>(await api.post(`/supply-chain/warehouse/transfers/${id}/execute`)); }
export async function getStockCounts(): Promise<StockCount[]> { return unwrap<StockCount[]>(await api.get('/supply-chain/warehouse/counts')); }
export async function createStockCount(locationId: number, notes?: string) { return unwrap<StockCount>(await api.post('/supply-chain/warehouse/counts', { locationId, notes })); }
export async function finalizeStockCount(id: number, lines: Array<{ inventoryId: number; countedQuantity: number }>) { return unwrap<StockCount>(await api.post(`/supply-chain/warehouse/counts/${id}/finalize`, { lines })); }
export async function createBarcode(payload: { outletId: number; inventoryId: number; barcode: string; aliasType?: string }) { return unwrap<any>(await api.post('/supply-chain/barcode', payload)); }
export async function resolveBarcode(barcode: string) { return unwrap<any>(await api.get(`/supply-chain/barcode/${encodeURIComponent(barcode)}`)); }
export async function getManufacturingOrders(): Promise<ManufacturingOrder[]> { return unwrap<ManufacturingOrder[]>(await api.get('/supply-chain/manufacturing/orders')); }
export async function createManufacturingOrder(payload: { outletId: number; itemId: number; quantityPlanned: number; notes?: string }) { return unwrap<ManufacturingOrder>(await api.post('/supply-chain/manufacturing/orders', payload)); }
export async function transitionManufacturingOrder(id: number, action: 'confirm' | 'start' | 'cancel') { return unwrap<ManufacturingOrder>(await api.post(`/supply-chain/manufacturing/orders/${id}/transition`, { action })); }
export async function completeManufacturingOrder(id: number, quantityProduced?: number) { return unwrap<ManufacturingOrder>(await api.post(`/supply-chain/manufacturing/orders/${id}/complete`, { quantityProduced })); }
export async function getQualityChecks(): Promise<QualityCheck[]> { return unwrap<QualityCheck[]>(await api.get('/supply-chain/quality/checks')); }
export async function resolveQualityCheck(id: number, status: 'pass' | 'fail' | 'waived', notes?: string) { return unwrap<QualityCheck>(await api.post(`/supply-chain/quality/checks/${id}/resolve`, { status, notes })); }
export async function getEquipment(): Promise<Equipment[]> { return unwrap<Equipment[]>(await api.get('/supply-chain/maintenance/equipment')); }
export async function createEquipment(payload: { outletId: number; code: string; name: string; category?: string; nextMaintenanceAt?: string | null }) { return unwrap<Equipment>(await api.post('/supply-chain/maintenance/equipment', payload)); }
export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> { return unwrap<MaintenanceRequest[]>(await api.get('/supply-chain/maintenance/requests')); }
export async function createMaintenanceRequest(payload: { equipmentId: number; title: string; priority?: string; requestType?: string; description?: string }) { return unwrap<MaintenanceRequest>(await api.post('/supply-chain/maintenance/requests', payload)); }
export async function updateMaintenanceRequest(id: number, status: string) { return unwrap<MaintenanceRequest>(await api.post(`/supply-chain/maintenance/requests/${id}/status`, { status })); }
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> { return unwrap<PurchaseOrder[]>(await api.get('/purchase-orders')); }
export async function updatePurchaseOrderStatus(id: number, status: string) { return unwrap<PurchaseOrder>(await api.patch(`/purchase-orders/${id}/status`, { status })); }
export async function receivePurchaseOrder(id: number, items: Array<{ itemId: number; receivedQty: number }>) { return unwrap<any>(await api.post(`/purchase-orders/${id}/receive`, { items })); }
export async function getProducts(): Promise<ProductLite[]> { return unwrap<ProductLite[]>(await api.get('/products')); }
