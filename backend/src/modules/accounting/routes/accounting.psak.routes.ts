import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as psakController from '../controllers/accounting.psak.controller';

const router = express.Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ===== PSAK 1: Laporan Posisi Keuangan (Neraca) =====
router.get('/posisi-keuangan', psakController.getLaporanPosisiKeuangan);
router.get('/balance-sheet', psakController.getLaporanPosisiKeuangan); // Alias

// ===== PSAK 1: Laporan Laba Rugi =====
router.get('/laba-rugi', psakController.getLaporanLabaRugi);
router.get('/income-statement', psakController.getLaporanLabaRugi); // Alias

// ===== PSAK 1: Laporan Perubahan Ekuitas =====
router.get('/perubahan-ekuitas', psakController.getLaporanPerubahanEkuitas);
router.get('/changes-in-equity', psakController.getLaporanPerubahanEkuitas); // Alias

// ===== PSAK 2: Laporan Arus Kas - Direct Method =====
router.get('/arus-kas/direct', psakController.getLaporanArusKasDirect);
router.get('/cash-flow/direct', psakController.getLaporanArusKasDirect); // Alias

// ===== PSAK 2: Laporan Arus Kas - Indirect Method =====
router.get('/arus-kas/indirect', psakController.getLaporanArusKasIndirect);
router.get('/cash-flow/indirect', psakController.getLaporanArusKasIndirect); // Alias

// ===== Catatan atas Laporan Keuangan =====
router.get('/catatan', psakController.getCatatanLaporanKeuangan);
router.get('/notes', psakController.getCatatanLaporanKeuangan); // Alias

export default router;
