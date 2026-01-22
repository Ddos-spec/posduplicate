import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as efakturController from '../controllers/accounting.efaktur.controller';

const router = express.Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ===== NSFP Management =====
/**
 * @swagger
 * /api/accounting/efaktur/nsfp:
 *   get:
 *     tags: [Accounting]
 *     summary: Get NSFP list
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: NSFP list
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
router.get('/nsfp', efakturController.getNSFP);
/**
 * @swagger
 * /api/accounting/efaktur/nsfp:
 *   post:
 *     tags: [Accounting]
 *     summary: Register NSFP
 *     description: Owner/Akuntan only
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
 *         description: NSFP registered
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/nsfp', roleMiddleware(['Owner', 'Akuntan']), efakturController.registerNSFP);

// ===== Faktur Pajak Keluaran =====
/**
 * @swagger
 * /api/accounting/efaktur/keluaran:
 *   get:
 *     tags: [Accounting]
 *     summary: Get faktur pajak keluaran
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Faktur keluaran list
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
router.get('/keluaran', efakturController.getFakturKeluaran);
/**
 * @swagger
 * /api/accounting/efaktur/keluaran:
 *   post:
 *     tags: [Accounting]
 *     summary: Create faktur pajak keluaran
 *     description: Owner/Akuntan only
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
 *         description: Faktur keluaran created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/keluaran', roleMiddleware(['Owner', 'Akuntan']), efakturController.createFakturKeluaran);
/**
 * @swagger
 * /api/accounting/efaktur/keluaran/from-ar/{arId}:
 *   post:
 *     tags: [Accounting]
 *     summary: Generate faktur from AR
 *     description: Owner/Akuntan only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: arId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Faktur generated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/keluaran/from-ar/:arId', roleMiddleware(['Owner', 'Akuntan']), efakturController.generateFakturFromAR);

// ===== Faktur Pajak Masukan =====
/**
 * @swagger
 * /api/accounting/efaktur/masukan:
 *   get:
 *     tags: [Accounting]
 *     summary: Get faktur pajak masukan
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Faktur masukan list
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
router.get('/masukan', efakturController.getFakturMasukan);
/**
 * @swagger
 * /api/accounting/efaktur/masukan:
 *   post:
 *     tags: [Accounting]
 *     summary: Input faktur pajak masukan
 *     description: Owner/Akuntan only
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
 *         description: Faktur masukan created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/masukan', roleMiddleware(['Owner', 'Akuntan']), efakturController.inputFakturMasukan);

// ===== PPh Management =====
/**
 * @swagger
 * /api/accounting/efaktur/pph/summary:
 *   get:
 *     tags: [Accounting]
 *     summary: Get PPh summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PPh summary
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
router.get('/pph/summary', efakturController.getPPhSummary);
/**
 * @swagger
 * /api/accounting/efaktur/pph:
 *   post:
 *     tags: [Accounting]
 *     summary: Create PPh record
 *     description: Owner/Akuntan only
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
 *         description: PPh record created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/pph', roleMiddleware(['Owner', 'Akuntan']), efakturController.createPPh);

// ===== SPT & Export =====
/**
 * @swagger
 * /api/accounting/efaktur/spt/ppn:
 *   get:
 *     tags: [Accounting]
 *     summary: Get SPT Masa PPN report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SPT PPN report
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
router.get('/spt/ppn', efakturController.getSPTMasaPPN);
/**
 * @swagger
 * /api/accounting/efaktur/export/csv:
 *   get:
 *     tags: [Accounting]
 *     summary: Export e-Faktur CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exported CSV file
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/export/csv', efakturController.exportEFakturCSV);

// ===== Tax Calculator =====
/**
 * @swagger
 * /api/accounting/efaktur/calculate:
 *   post:
 *     tags: [Accounting]
 *     summary: Calculate tax
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
 *         description: Tax calculation result
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/calculate', efakturController.calculateTax);

export default router;
