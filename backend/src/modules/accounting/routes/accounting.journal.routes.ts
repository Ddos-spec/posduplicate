import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as journalController from '../controllers/accounting.journal.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

// Read
/**
 * @swagger
 * /api/accounting/journal:
 *   get:
 *     tags: [Accounting]
 *     summary: Get journal entries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Journal entry list
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
router.get('/', journalController.getJournals);
/**
 * @swagger
 * /api/accounting/journal/{id}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get journal entry by ID
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
 *         description: Journal entry detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Journal entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', journalController.getJournalById);

// Write
/**
 * @swagger
 * /api/accounting/journal/create:
 *   post:
 *     tags: [Accounting]
 *     summary: Create journal entry
 *     description: Owner/Manager/Super Admin only
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
 *         description: Journal entry created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', roleMiddleware(['Owner', 'Super Admin', 'Manager']), journalController.createJournal);
/**
 * @swagger
 * /api/accounting/journal/{id}/post:
 *   post:
 *     tags: [Accounting]
 *     summary: Post journal entry
 *     description: Owner/Manager/Super Admin only
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
 *         description: Journal entry posted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/post', roleMiddleware(['Owner', 'Super Admin', 'Manager']), journalController.postJournal);
/**
 * @swagger
 * /api/accounting/journal/{id}/void:
 *   post:
 *     tags: [Accounting]
 *     summary: Void journal entry
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
 *         description: Journal entry voided
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/void', roleMiddleware(['Owner', 'Super Admin']), journalController.voidJournal);

export default router;
