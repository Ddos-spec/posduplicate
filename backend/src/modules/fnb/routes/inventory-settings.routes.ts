import { Router } from 'express';
import {
  getInventorySettings,
  updateInventorySettings,
  getBusinessTypeFields,
  getInventorySummary
} from '../controllers/inventory-settings.controller';

const router = Router();

// Get business type specific fields (must be before other routes)
router.get('/business-types', getBusinessTypeFields);

// Get inventory summary by category
router.get('/summary', getInventorySummary);

// Get inventory settings
router.get('/', getInventorySettings);

// Update inventory settings
router.put('/', updateInventorySettings);

export default router;
