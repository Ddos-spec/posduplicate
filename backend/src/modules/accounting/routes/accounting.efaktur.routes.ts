import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as efakturController from '../controllers/accounting.efaktur.controller';

const router = express.Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ===== NSFP Management =====
router.get('/nsfp', efakturController.getNSFP);
router.post('/nsfp', roleMiddleware(['Owner', 'Akuntan']), efakturController.registerNSFP);

// ===== Faktur Pajak Keluaran =====
router.get('/keluaran', efakturController.getFakturKeluaran);
router.post('/keluaran', roleMiddleware(['Owner', 'Akuntan']), efakturController.createFakturKeluaran);
router.post('/keluaran/from-ar/:arId', roleMiddleware(['Owner', 'Akuntan']), efakturController.generateFakturFromAR);

// ===== Faktur Pajak Masukan =====
router.get('/masukan', efakturController.getFakturMasukan);
router.post('/masukan', roleMiddleware(['Owner', 'Akuntan']), efakturController.inputFakturMasukan);

// ===== PPh Management =====
router.get('/pph/summary', efakturController.getPPhSummary);
router.post('/pph', roleMiddleware(['Owner', 'Akuntan']), efakturController.createPPh);

// ===== SPT & Export =====
router.get('/spt/ppn', efakturController.getSPTMasaPPN);
router.get('/export/csv', efakturController.exportEFakturCSV);

// ===== Tax Calculator =====
router.post('/calculate', efakturController.calculateTax);

export default router;
