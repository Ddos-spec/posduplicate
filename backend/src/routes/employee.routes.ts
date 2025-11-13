import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeShifts
} from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.get('/:id/shifts', getEmployeeShifts);
router.post('/', ownerOnly, createEmployee);
router.put('/:id', ownerOnly, updateEmployee);
router.delete('/:id', ownerOnly, deleteEmployee);

export default router;
