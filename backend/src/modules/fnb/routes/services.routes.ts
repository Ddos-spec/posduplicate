import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  createServicePlanning,
  createServiceProject,
  createServiceTask,
  decideServiceTimesheet,
  getMyServiceTimesheets,
  getServicePlanning,
  getServiceProjects,
  getServiceTasks,
  getServiceTimesheets,
  submitMyServiceTimesheet,
  updateServicePlanningStatus,
  updateServiceProjectStatus,
  updateServiceTaskStatus,
} from '../controllers/services-project.p2.controller';
import { getMyServiceTimesheetContext } from '../controllers/services-timesheet-self-context.p2.controller';
import {
  arriveMyFieldServiceOrder,
  cancelFieldServiceOrder,
  completeMyFieldServiceOrder,
  createFieldServiceOrder,
  departMyFieldServiceOrder,
  getFieldServiceEvents,
  getFieldServiceOrders,
  getMyFieldServiceOrders,
  scheduleFieldServiceOrder,
} from '../controllers/services-field-service.p2.controller';
import {
  addHelpdeskMessage,
  assignHelpdeskTicket,
  createHelpdeskSlaPolicy,
  createHelpdeskTicket,
  getHelpdeskEvents,
  getHelpdeskMessages,
  getHelpdeskSlaPolicies,
  getHelpdeskTickets,
  getMyHelpdeskTickets,
  replyMyHelpdeskTicket,
  updateHelpdeskTicketStatus,
  updateMyHelpdeskTicketStatus,
} from '../controllers/services-helpdesk.p2.controller';
import { getMyHelpdeskMessages } from '../controllers/services-helpdesk-self-messages.p2.controller';
import {
  cancelAppointment,
  checkInAppointment,
  checkInMyAppointment,
  completeAppointment,
  completeMyAppointment,
  confirmAppointment,
  createAppointment,
  createAppointmentType,
  getAppointmentEvents,
  getAppointments,
  getAppointmentTypes,
  getMyAppointments,
  markAppointmentNoShow,
  rescheduleAppointment,
} from '../controllers/services-appointments.p2.controller';
import {
  getAppointmentContext,
  getFieldServiceContext,
  getHelpdeskContext,
} from '../controllers/services-operations-context.p2.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/projects', requireCapability('services.project.read'), getServiceProjects);
router.post('/projects', requireCapability('services.project.manage'), createServiceProject);
router.patch('/projects/:id/status', requireCapability('services.project.manage'), updateServiceProjectStatus);

router.get('/tasks', requireCapability('services.project.read'), getServiceTasks);
router.post('/tasks', requireCapability('services.project.manage'), createServiceTask);
router.patch('/tasks/:id/status', requireCapability('services.project.manage'), updateServiceTaskStatus);

router.get('/timesheets', requireCapability('services.timesheet.read'), getServiceTimesheets);
router.get('/timesheets/me/context', requireCapability('services.timesheet.self'), getMyServiceTimesheetContext);
router.get('/timesheets/me', requireCapability('services.timesheet.self'), getMyServiceTimesheets);
router.post('/timesheets/me', requireCapability('services.timesheet.self'), submitMyServiceTimesheet);
router.post('/timesheets/:id/decision', requireCapability('services.timesheet.manage'), decideServiceTimesheet);

router.get('/planning', requireCapability('services.planning.read'), getServicePlanning);
router.post('/planning', requireCapability('services.planning.manage'), createServicePlanning);
router.patch('/planning/:id/status', requireCapability('services.planning.manage'), updateServicePlanningStatus);

router.get('/field-service/context', requireCapability('services.field_service.manage'), getFieldServiceContext);
router.get('/field-service/orders', requireCapability('services.field_service.read'), getFieldServiceOrders);
router.post('/field-service/orders', requireCapability('services.field_service.manage'), createFieldServiceOrder);
router.post('/field-service/orders/:id/schedule', requireCapability('services.field_service.manage'), scheduleFieldServiceOrder);
router.post('/field-service/orders/:id/cancel', requireCapability('services.field_service.manage'), cancelFieldServiceOrder);
router.get('/field-service/orders/:id/events', requireCapability('services.field_service.read'), getFieldServiceEvents);
router.get('/field-service/me', requireCapability('services.field_service.self'), getMyFieldServiceOrders);
router.post('/field-service/:id/depart', requireCapability('services.field_service.self'), departMyFieldServiceOrder);
router.post('/field-service/:id/arrive', requireCapability('services.field_service.self'), arriveMyFieldServiceOrder);
router.post('/field-service/:id/complete', requireCapability('services.field_service.self'), completeMyFieldServiceOrder);

router.get('/helpdesk/context', requireCapability('services.helpdesk.manage'), getHelpdeskContext);
router.get('/helpdesk/slas', requireCapability('services.helpdesk.read'), getHelpdeskSlaPolicies);
router.post('/helpdesk/slas', requireCapability('services.helpdesk.manage'), createHelpdeskSlaPolicy);
router.get('/helpdesk/tickets', requireCapability('services.helpdesk.read'), getHelpdeskTickets);
router.post('/helpdesk/tickets', requireCapability('services.helpdesk.manage'), createHelpdeskTicket);
router.post('/helpdesk/tickets/:id/assign', requireCapability('services.helpdesk.manage'), assignHelpdeskTicket);
router.patch('/helpdesk/tickets/:id/status', requireCapability('services.helpdesk.manage'), updateHelpdeskTicketStatus);
router.get('/helpdesk/tickets/:id/messages', requireCapability('services.helpdesk.read'), getHelpdeskMessages);
router.post('/helpdesk/tickets/:id/messages', requireCapability('services.helpdesk.manage'), addHelpdeskMessage);
router.get('/helpdesk/tickets/:id/events', requireCapability('services.helpdesk.read'), getHelpdeskEvents);
router.get('/helpdesk/me', requireCapability('services.helpdesk.self'), getMyHelpdeskTickets);
router.get('/helpdesk/me/:id/messages', requireCapability('services.helpdesk.self'), getMyHelpdeskMessages);
router.post('/helpdesk/me/:id/reply', requireCapability('services.helpdesk.self'), replyMyHelpdeskTicket);
router.patch('/helpdesk/me/:id/status', requireCapability('services.helpdesk.self'), updateMyHelpdeskTicketStatus);

router.get('/appointments/context', requireCapability('services.appointment.manage'), getAppointmentContext);
router.get('/appointments/types', requireCapability('services.appointment.read'), getAppointmentTypes);
router.post('/appointments/types', requireCapability('services.appointment.manage'), createAppointmentType);
router.get('/appointments', requireCapability('services.appointment.read'), getAppointments);
router.post('/appointments', requireCapability('services.appointment.manage'), createAppointment);
router.post('/appointments/:id/confirm', requireCapability('services.appointment.manage'), confirmAppointment);
router.post('/appointments/:id/reschedule', requireCapability('services.appointment.manage'), rescheduleAppointment);
router.post('/appointments/:id/check-in', requireCapability('services.appointment.manage'), checkInAppointment);
router.post('/appointments/:id/complete', requireCapability('services.appointment.manage'), completeAppointment);
router.post('/appointments/:id/no-show', requireCapability('services.appointment.manage'), markAppointmentNoShow);
router.post('/appointments/:id/cancel', requireCapability('services.appointment.manage'), cancelAppointment);
router.get('/appointments/:id/events', requireCapability('services.appointment.read'), getAppointmentEvents);
router.get('/appointments/me', requireCapability('services.appointment.self'), getMyAppointments);
router.post('/appointments/me/:id/check-in', requireCapability('services.appointment.self'), checkInMyAppointment);
router.post('/appointments/me/:id/complete', requireCapability('services.appointment.self'), completeMyAppointment);

export default router;
