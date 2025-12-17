import { Router } from 'express';
import {
  getPrinterSettings,
  updatePrinterSettings,
  resetPrinterSettings,
} from '../controllers/printerSettings.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getPrinterSettings);
router.put('/', updatePrinterSettings);
router.post('/reset', resetPrinterSettings);

export default router;
