import { Router } from 'express';
import {
  startShift,
  getCurrentShift,
  endShift,
  getShiftReport,
  getDailyReport,
  getShiftHistory,
} from '../controllers/shift.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication and tenant isolation
router.use(authMiddleware, tenantMiddleware);

// Start a new shift
router.post('/start', startShift);

// Get current active shift
router.get('/current', getCurrentShift);

// End shift
router.post('/end', endShift);

// Get shift report
router.get('/:shiftId/report', getShiftReport);

// Get daily report
router.get('/daily-report', getDailyReport);

// Get shift history
router.get('/history', getShiftHistory);

export default router;
