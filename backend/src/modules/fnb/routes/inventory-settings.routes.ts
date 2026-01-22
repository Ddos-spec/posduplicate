import { Router } from 'express';
import {
  getInventorySettings,
  updateInventorySettings,
  getBusinessTypeFields,
  getInventorySummary
} from '../controllers/inventory-settings.controller';

const router = Router();

// Get business type specific fields (must be before other routes)
/**
 * @swagger
 * /api/inventory-settings/business-types:
 *   get:
 *     tags: [Inventory Settings]
 *     summary: Get business type fields
 *     responses:
 *       200:
 *         description: Business type fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/business-types', getBusinessTypeFields);

// Get inventory summary by category
/**
 * @swagger
 * /api/inventory-settings/summary:
 *   get:
 *     tags: [Inventory Settings]
 *     summary: Get inventory summary by category
 *     responses:
 *       200:
 *         description: Inventory summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/summary', getInventorySummary);

// Get inventory settings
/**
 * @swagger
 * /api/inventory-settings:
 *   get:
 *     tags: [Inventory Settings]
 *     summary: Get inventory settings
 *     responses:
 *       200:
 *         description: Inventory settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', getInventorySettings);

// Update inventory settings
/**
 * @swagger
 * /api/inventory-settings:
 *   put:
 *     tags: [Inventory Settings]
 *     summary: Update inventory settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Inventory settings updated
 */
router.put('/', updateInventorySettings);

export default router;
