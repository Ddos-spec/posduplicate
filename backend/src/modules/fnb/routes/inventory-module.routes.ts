import { Router } from 'express';
import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getLowStockItems,
  getInventoryCategories,
  adjustInventoryStock,
  getInventoryStats,
  getInventoryAlerts,
  generateAlerts,
  resolveAlert,
  getInventoryForecast
} from '../controllers/inventory-module.controller';

const router = Router();

// Dashboard & Stats
router.get('/stats', getInventoryStats);

// Alerts
router.get('/alerts', getInventoryAlerts);
router.post('/alerts/generate', generateAlerts);
router.put('/alerts/:id/resolve', resolveAlert);

// Forecast
router.get('/forecast', getInventoryForecast);

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
