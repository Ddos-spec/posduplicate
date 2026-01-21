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
router.get('/suggestions', getPOSuggestions);

// Get all purchase orders
router.get('/', getAllPurchaseOrders);

// Get single purchase order
router.get('/:id', getPurchaseOrderById);

// Create purchase order
router.post('/', createPurchaseOrder);

// Update purchase order
router.put('/:id', updatePurchaseOrder);

// Update PO status
router.patch('/:id/status', updatePOStatus);

// Receive PO items
router.post('/:id/receive', receivePOItems);

// Delete purchase order
router.delete('/:id', deletePurchaseOrder);

export default router;
