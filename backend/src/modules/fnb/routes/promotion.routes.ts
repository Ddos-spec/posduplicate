import { Router } from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getApplicablePromotions,
  applyPromotion
} from '../controllers/promotion.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// Public route for getting applicable promotions
/**
 * @swagger
 * /api/promotions/applicable:
 *   post:
 *     tags: [Promotions]
 *     summary: Get applicable promotions
 *     description: Public endpoint to check applicable promotions
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Applicable promotions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/applicable', getApplicablePromotions);

// Protected routes
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: Get promotions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Promotion list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getPromotions);
/**
 * @swagger
 * /api/promotions/{id}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get promotion by ID
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
 *         description: Promotion detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Promotion not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getPromotionById);
/**
 * @swagger
 * /api/promotions:
 *   post:
 *     tags: [Promotions]
 *     summary: Create promotion
 *     description: Owner/Manager only
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               value:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Promotion created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', ownerOnly, createPromotion);
/**
 * @swagger
 * /api/promotions/{id}:
 *   put:
 *     tags: [Promotions]
 *     summary: Update promotion
 *     description: Owner/Manager only
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
 *         description: Promotion updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', ownerOnly, updatePromotion);
/**
 * @swagger
 * /api/promotions/{id}:
 *   delete:
 *     tags: [Promotions]
 *     summary: Delete promotion
 *     description: Owner/Manager only
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
 *         description: Promotion deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', ownerOnly, deletePromotion);
/**
 * @swagger
 * /api/promotions/apply:
 *   post:
 *     tags: [Promotions]
 *     summary: Apply promotion to cart/transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Promotion applied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/apply', applyPromotion);

export default router;
