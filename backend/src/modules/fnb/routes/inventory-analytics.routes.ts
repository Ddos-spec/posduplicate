import { Router } from 'express';
import {
  getRecipeCosts,
  recalculateItemCost,
  recalculateAllItemCosts,
  getActualVsTheoretical,
  getMenuEngineering,
  getCOGSSummary
} from '../controllers/inventory-analytics.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/inventory-analytics/recipe-costs:
 *   get:
 *     summary: Get recipe costs for all menu items
 *     tags: [Inventory Analytics]
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recipe cost analysis
 */
router.get('/recipe-costs', getRecipeCosts);

/**
 * @swagger
 * /api/inventory-analytics/recipe-costs/{id}/recalculate:
 *   post:
 *     summary: Recalculate cost for single item
 *     tags: [Inventory Analytics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item cost recalculated
 */
router.post('/recipe-costs/:id/recalculate', recalculateItemCost);

/**
 * @swagger
 * /api/inventory-analytics/recipe-costs/recalculate-all:
 *   post:
 *     summary: Recalculate costs for all items
 *     tags: [Inventory Analytics]
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All item costs recalculated
 */
router.post('/recipe-costs/recalculate-all', recalculateAllItemCosts);

/**
 * @swagger
 * /api/inventory-analytics/variance:
 *   get:
 *     summary: Get actual vs theoretical usage variance
 *     tags: [Inventory Analytics]
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Variance analysis report
 */
router.get('/variance', getActualVsTheoretical);

/**
 * @swagger
 * /api/inventory-analytics/menu-engineering:
 *   get:
 *     summary: Get menu engineering matrix (Star/Plowhorse/Puzzle/Dog)
 *     tags: [Inventory Analytics]
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Menu engineering analysis
 */
router.get('/menu-engineering', getMenuEngineering);

/**
 * @swagger
 * /api/inventory-analytics/cogs:
 *   get:
 *     summary: Get COGS summary report
 *     tags: [Inventory Analytics]
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: COGS summary
 */
router.get('/cogs', getCOGSSummary);

export default router;
