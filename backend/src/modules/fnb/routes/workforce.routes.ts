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
import {
  cancelRecruitmentInterview,
  completeRecruitmentInterview,
  createRecruitmentApplicant,
  createRecruitmentOffer,
  createRecruitmentVacancy,
  getRecruitmentApplicants,
  getRecruitmentInterviews,
  getRecruitmentOffers,
  getRecruitmentVacancies,
  hireRecruitmentApplicant,
  moveRecruitmentApplicantStage,
  scheduleRecruitmentInterview,
  updateRecruitmentOfferStatus,
  updateRecruitmentVacancyStatus,
} from '../controllers/workforce-recruitment.p2.controller';

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

router.get('/recruitment/vacancies', requireCapability('workforce.recruitment.read'), getRecruitmentVacancies);
router.post('/recruitment/vacancies', requireCapability('workforce.recruitment.manage'), createRecruitmentVacancy);
router.patch('/recruitment/vacancies/:id/status', requireCapability('workforce.recruitment.manage'), updateRecruitmentVacancyStatus);

router.get('/recruitment/applicants', requireCapability('workforce.recruitment.read'), getRecruitmentApplicants);
router.post('/recruitment/applicants', requireCapability('workforce.recruitment.manage'), createRecruitmentApplicant);
router.patch('/recruitment/applicants/:id/stage', requireCapability('workforce.recruitment.manage'), moveRecruitmentApplicantStage);
router.post('/recruitment/applicants/:id/interviews', requireCapability('workforce.recruitment.manage'), scheduleRecruitmentInterview);
router.post('/recruitment/applicants/:id/offers', requireCapability('workforce.recruitment.manage'), createRecruitmentOffer);
router.post('/recruitment/applicants/:id/hire', requireCapability('workforce.recruitment.manage'), hireRecruitmentApplicant);

router.get('/recruitment/interviews', requireCapability('workforce.recruitment.read'), getRecruitmentInterviews);
router.post('/recruitment/interviews/:id/complete', requireCapability('workforce.recruitment.manage'), completeRecruitmentInterview);
router.post('/recruitment/interviews/:id/cancel', requireCapability('workforce.recruitment.manage'), cancelRecruitmentInterview);

router.get('/recruitment/offers', requireCapability('workforce.recruitment.read'), getRecruitmentOffers);
router.patch('/recruitment/offers/:id/status', requireCapability('workforce.recruitment.manage'), updateRecruitmentOfferStatus);

export default router;
