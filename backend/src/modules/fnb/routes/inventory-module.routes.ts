import { Router } from 'express';
import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getLowStockItems,
  getInventoryCategories,
  adjustInventoryStock
} from '../controllers/inventory-module.controller';

const router = Router();

// Get all inventory items
router.get('/', getAllInventory);

// Get low stock items
router.get('/low-stock', getLowStockItems);

// Get inventory categories
router.get('/categories', getInventoryCategories);

// Get single inventory item
router.get('/:id', getInventoryById);

// Create new inventory item
router.post('/', createInventory);

// Update inventory item
router.put('/:id', updateInventory);

// Delete inventory item
router.delete('/:id', deleteInventory);

// Adjust stock
router.post('/:id/adjust', adjustInventoryStock);

export default router;
