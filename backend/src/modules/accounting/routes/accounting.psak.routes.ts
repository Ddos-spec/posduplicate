import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as psakController from '../controllers/accounting.psak.controller';

const router = express.Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ===== PSAK 1: Laporan Posisi Keuangan (Neraca) =====
/**
 * @swagger
 * /api/accounting/psak/posisi-keuangan:
 *   get:
 *     tags: [Accounting]
 *     summary: Get laporan posisi keuangan (neraca)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Laporan posisi keuangan
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
router.get('/posisi-keuangan', psakController.getLaporanPosisiKeuangan);
/**
 * @swagger
 * /api/accounting/psak/balance-sheet:
 *   get:
 *     tags: [Accounting]
 *     summary: Get balance sheet (alias)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance sheet report
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
router.get('/balance-sheet', psakController.getLaporanPosisiKeuangan); // Alias

// ===== PSAK 1: Laporan Laba Rugi =====
/**
 * @swagger
 * /api/accounting/psak/laba-rugi:
 *   get:
 *     tags: [Accounting]
 *     summary: Get laporan laba rugi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Laporan laba rugi
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
router.get('/laba-rugi', psakController.getLaporanLabaRugi);
/**
 * @swagger
 * /api/accounting/psak/income-statement:
 *   get:
 *     tags: [Accounting]
 *     summary: Get income statement (alias)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Income statement report
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
router.get('/income-statement', psakController.getLaporanLabaRugi); // Alias

// ===== PSAK 1: Laporan Perubahan Ekuitas =====
/**
 * @swagger
 * /api/accounting/psak/perubahan-ekuitas:
 *   get:
 *     tags: [Accounting]
 *     summary: Get laporan perubahan ekuitas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Laporan perubahan ekuitas
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
router.get('/perubahan-ekuitas', psakController.getLaporanPerubahanEkuitas);
/**
 * @swagger
 * /api/accounting/psak/changes-in-equity:
 *   get:
 *     tags: [Accounting]
 *     summary: Get changes in equity (alias)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Changes in equity report
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
router.get('/changes-in-equity', psakController.getLaporanPerubahanEkuitas); // Alias

// ===== PSAK 2: Laporan Arus Kas - Direct Method =====
/**
 * @swagger
 * /api/accounting/psak/arus-kas/direct:
 *   get:
 *     tags: [Accounting]
 *     summary: Get cash flow report (direct)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash flow direct report
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
router.get('/arus-kas/direct', psakController.getLaporanArusKasDirect);
/**
 * @swagger
 * /api/accounting/psak/cash-flow/direct:
 *   get:
 *     tags: [Accounting]
 *     summary: Get cash flow report direct (alias)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash flow direct report
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
router.get('/cash-flow/direct', psakController.getLaporanArusKasDirect); // Alias

// ===== PSAK 2: Laporan Arus Kas - Indirect Method =====
/**
 * @swagger
 * /api/accounting/psak/arus-kas/indirect:
 *   get:
 *     tags: [Accounting]
 *     summary: Get cash flow report (indirect)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash flow indirect report
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
router.get('/arus-kas/indirect', psakController.getLaporanArusKasIndirect);
/**
 * @swagger
 * /api/accounting/psak/cash-flow/indirect:
 *   get:
 *     tags: [Accounting]
 *     summary: Get cash flow report indirect (alias)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash flow indirect report
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
router.get('/cash-flow/indirect', psakController.getLaporanArusKasIndirect); // Alias

// ===== Catatan atas Laporan Keuangan =====
/**
 * @swagger
 * /api/accounting/psak/catatan:
 *   get:
 *     tags: [Accounting]
 *     summary: Get notes to financial statements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notes to financial statements
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
router.get('/catatan', psakController.getCatatanLaporanKeuangan);
/**
 * @swagger
 * /api/accounting/psak/notes:
 *   get:
 *     tags: [Accounting]
 *     summary: Get notes to financial statements (alias)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notes to financial statements
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
router.get('/notes', psakController.getCatatanLaporanKeuangan); // Alias

export default router;
