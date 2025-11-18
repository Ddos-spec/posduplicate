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

// SECURITY: Employee data (including salary) should only be accessible by owners/admins
// All GET routes now require ownerOnly middleware to prevent cashiers from viewing sensitive data
router.get('/', ownerOnly, getEmployees);
router.get('/:id', ownerOnly, getEmployeeById);
router.get('/:id/shifts', ownerOnly, getEmployeeShifts);
router.post('/', ownerOnly, createEmployee);
router.put('/:id', ownerOnly, updateEmployee);
router.delete('/:id', ownerOnly, deleteEmployee);

export default router;
