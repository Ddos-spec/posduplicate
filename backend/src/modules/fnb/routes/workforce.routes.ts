import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  clockInSelf,
  clockOutSelf,
  getAttendanceSessions,
  getEmployeeDirectory,
  getMyAttendance,
} from '../controllers/workforce.p2.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/employees', requireCapability('workforce.employee.read'), getEmployeeDirectory);
router.get('/attendance', requireCapability('workforce.attendance.read'), getAttendanceSessions);
router.get('/attendance/me', requireCapability('workforce.attendance.self'), getMyAttendance);
router.post('/attendance/clock-in', requireCapability('workforce.attendance.self'), clockInSelf);
router.post('/attendance/clock-out', requireCapability('workforce.attendance.self'), clockOutSelf);

export default router;
