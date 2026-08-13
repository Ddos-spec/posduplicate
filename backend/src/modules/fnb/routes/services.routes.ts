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

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/projects', requireCapability('services.project.read'), getServiceProjects);
router.post('/projects', requireCapability('services.project.manage'), createServiceProject);
router.patch('/projects/:id/status', requireCapability('services.project.manage'), updateServiceProjectStatus);

router.get('/tasks', requireCapability('services.project.read'), getServiceTasks);
router.post('/tasks', requireCapability('services.project.manage'), createServiceTask);
router.patch('/tasks/:id/status', requireCapability('services.project.manage'), updateServiceTaskStatus);

router.get('/timesheets', requireCapability('services.timesheet.read'), getServiceTimesheets);
router.get('/timesheets/me', requireCapability('services.timesheet.self'), getMyServiceTimesheets);
router.post('/timesheets/me', requireCapability('services.timesheet.self'), submitMyServiceTimesheet);
router.post('/timesheets/:id/decision', requireCapability('services.timesheet.manage'), decideServiceTimesheet);

router.get('/planning', requireCapability('services.planning.read'), getServicePlanning);
router.post('/planning', requireCapability('services.planning.manage'), createServicePlanning);
router.patch('/planning/:id/status', requireCapability('services.planning.manage'), updateServicePlanningStatus);

router.get('/field-service/orders', requireCapability('services.field_service.read'), getFieldServiceOrders);
router.post('/field-service/orders', requireCapability('services.field_service.manage'), createFieldServiceOrder);
router.post('/field-service/orders/:id/schedule', requireCapability('services.field_service.manage'), scheduleFieldServiceOrder);
router.post('/field-service/orders/:id/cancel', requireCapability('services.field_service.manage'), cancelFieldServiceOrder);
router.get('/field-service/orders/:id/events', requireCapability('services.field_service.read'), getFieldServiceEvents);
router.get('/field-service/me', requireCapability('services.field_service.self'), getMyFieldServiceOrders);
router.post('/field-service/:id/depart', requireCapability('services.field_service.self'), departMyFieldServiceOrder);
router.post('/field-service/:id/arrive', requireCapability('services.field_service.self'), arriveMyFieldServiceOrder);
router.post('/field-service/:id/complete', requireCapability('services.field_service.self'), completeMyFieldServiceOrder);

export default router;
