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
import {
  cancelAppraisal,
  createAppraisal,
  createAppraisalCycle,
  finalizeAppraisal,
  getAppraisalCycles,
  getAppraisals,
  getMyAppraisals,
  submitMyAppraisal,
  updateAppraisalCycleStatus,
} from '../controllers/workforce-appraisal.p2.controller';

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

router.get('/appraisals/cycles', requireCapability('workforce.appraisal.read'), getAppraisalCycles);
router.post('/appraisals/cycles', requireCapability('workforce.appraisal.manage'), createAppraisalCycle);
router.patch('/appraisals/cycles/:id/status', requireCapability('workforce.appraisal.manage'), updateAppraisalCycleStatus);
router.get('/appraisals', requireCapability('workforce.appraisal.read'), getAppraisals);
router.post('/appraisals', requireCapability('workforce.appraisal.manage'), createAppraisal);
router.get('/appraisals/me', requireCapability('workforce.appraisal.self'), getMyAppraisals);
router.post('/appraisals/:id/self-submit', requireCapability('workforce.appraisal.self'), submitMyAppraisal);
router.post('/appraisals/:id/finalize', requireCapability('workforce.appraisal.manage'), finalizeAppraisal);
router.post('/appraisals/:id/cancel', requireCapability('workforce.appraisal.manage'), cancelAppraisal);

export default router;
