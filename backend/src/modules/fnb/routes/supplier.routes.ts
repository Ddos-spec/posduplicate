import { Router } from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierSpending
} from '../controllers/supplier.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get suppliers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supplier list
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
router.get('/', getSuppliers);
/**
 * @swagger
 * /api/suppliers/spending:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get supplier spending summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supplier spending data
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
router.get('/spending', getSupplierSpending);
/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get supplier by ID
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
 *         description: Supplier detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Supplier not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getSupplier);
/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create supplier
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
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Supplier created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', ownerOnly, createSupplier); // Only Owner/Manager can create
/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     tags: [Suppliers]
 *     summary: Update supplier
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
 *         description: Supplier updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', ownerOnly, updateSupplier); // Only Owner/Manager can update
/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete supplier
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
 *         description: Supplier deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', ownerOnly, deleteSupplier); // Only Owner/Manager can delete

export default router;
