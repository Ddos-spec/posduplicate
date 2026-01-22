import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as userController from '../controllers/accounting.user.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

/**
 * @swagger
 * /api/accounting/users:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounting users
 *     description: Owner/Manager/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounting user list
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
router.get('/', roleMiddleware(['Owner', 'Super Admin', 'Manager']), userController.getUsers);
/**
 * @swagger
 * /api/accounting/users/create:
 *   post:
 *     tags: [Accounting]
 *     summary: Create accounting user
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
 *         description: Accounting user created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', roleMiddleware(['Owner', 'Super Admin']), userController.createUser);
/**
 * @swagger
 * /api/accounting/users/{id}:
 *   patch:
 *     tags: [Accounting]
 *     summary: Update accounting user
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
 *         description: Accounting user updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin']), userController.updateUser);
/**
 * @swagger
 * /api/accounting/users/{id}:
 *   delete:
 *     tags: [Accounting]
 *     summary: Delete accounting user
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
 *         description: Accounting user deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', roleMiddleware(['Owner', 'Super Admin']), userController.deleteUser);

export default router;
