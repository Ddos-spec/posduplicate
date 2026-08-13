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
import {
  cancelMyLeaveRequest,
  createLeaveAllocation,
  createLeaveType,
  decideLeaveRequest,
  getLeaveAllocations,
  getLeaveRequests,
  getLeaveTypes,
  getMyLeave,
  requestLeaveSelf,
} from '../controllers/workforce-leave.p2.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/employees', requireCapability('workforce.employee.read'), getEmployeeDirectory);

router.get('/attendance', requireCapability('workforce.attendance.read'), getAttendanceSessions);
router.get('/attendance/me', requireCapability('workforce.attendance.self'), getMyAttendance);
router.post('/attendance/clock-in', requireCapability('workforce.attendance.self'), clockInSelf);
router.post('/attendance/clock-out', requireCapability('workforce.attendance.self'), clockOutSelf);

router.get('/leave/types', requireCapability('workforce.leave.self'), getLeaveTypes);
router.post('/leave/types', requireCapability('workforce.leave.manage'), createLeaveType);
router.get('/leave/allocations', requireCapability('workforce.leave.read'), getLeaveAllocations);
router.post('/leave/allocations', requireCapability('workforce.leave.manage'), createLeaveAllocation);
router.get('/leave/requests', requireCapability('workforce.leave.read'), getLeaveRequests);
router.post('/leave/requests/:id/decision', requireCapability('workforce.leave.manage'), decideLeaveRequest);
router.get('/leave/me', requireCapability('workforce.leave.self'), getMyLeave);
router.post('/leave/request', requireCapability('workforce.leave.self'), requestLeaveSelf);
router.post('/leave/requests/:id/cancel', requireCapability('workforce.leave.self'), cancelMyLeaveRequest);

export default router;
