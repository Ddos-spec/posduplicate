import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as assetController from '../controllers/accounting.asset.controller';

const router = Router();

// Fixed Assets CRUD
/**
 * @swagger
 * /api/accounting/assets:
 *   get:
 *     tags: [Accounting]
 *     summary: Get fixed assets
 *     responses:
 *       200:
 *         description: Asset list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', assetController.getAssets);
/**
 * @swagger
 * /api/accounting/assets/depreciation-history:
 *   get:
 *     tags: [Accounting]
 *     summary: Get depreciation history
 *     responses:
 *       200:
 *         description: Depreciation history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/depreciation-history', assetController.getDepreciationHistory);
/**
 * @swagger
 * /api/accounting/assets/{id}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get asset by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/:id', assetController.getAssetById);
/**
 * @swagger
 * /api/accounting/assets:
 *   post:
 *     tags: [Accounting]
 *     summary: Create asset
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Asset created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', roleMiddleware(['Owner', 'Super Admin']), assetController.createAsset);
/**
 * @swagger
 * /api/accounting/assets/{id}:
 *   patch:
 *     tags: [Accounting]
 *     summary: Update asset
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Asset updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin']), assetController.updateAsset);
/**
 * @swagger
 * /api/accounting/assets/{id}/depreciate:
 *   post:
 *     tags: [Accounting]
 *     summary: Run asset depreciation
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Depreciation executed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/depreciate', roleMiddleware(['Owner', 'Super Admin']), assetController.runDepreciation);
/**
 * @swagger
 * /api/accounting/assets/{id}/dispose:
 *   post:
 *     tags: [Accounting]
 *     summary: Dispose asset
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset disposed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/dispose', roleMiddleware(['Owner', 'Super Admin']), assetController.disposeAsset);

// Bulk depreciation
/**
 * @swagger
 * /api/accounting/assets/depreciate-all:
 *   post:
 *     tags: [Accounting]
 *     summary: Run monthly depreciation for all assets
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk depreciation executed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/depreciate-all', roleMiddleware(['Owner', 'Super Admin']), assetController.runMonthlyDepreciation);

export default router;
