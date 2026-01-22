import { Router } from 'express';
import {
  getTables,
  getAvailableTables,
  updateTableStatus,
  createTable
} from '../controllers/table.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/tables:
 *   get:
 *     tags: [Tables]
 *     summary: Get tables
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Table list
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
router.get('/', getTables);
/**
 * @swagger
 * /api/tables/available:
 *   get:
 *     tags: [Tables]
 *     summary: Get available tables
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available tables
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
router.get('/available', getAvailableTables);
/**
 * @swagger
 * /api/tables:
 *   post:
 *     tags: [Tables]
 *     summary: Create table
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
 *             properties:
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Table created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createTable);
/**
 * @swagger
 * /api/tables/{id}/status:
 *   put:
 *     tags: [Tables]
 *     summary: Update table status
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
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Table status updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/status', updateTableStatus);

export default router;
