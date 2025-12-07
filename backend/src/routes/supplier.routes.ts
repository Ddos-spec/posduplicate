import { Router } from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierSpending
} from '../controllers/supplier.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getSuppliers);
router.get('/spending', getSupplierSpending);
router.get('/:id', getSupplier);
router.post('/', ownerOnly, createSupplier); // Only Owner/Manager can create
router.put('/:id', ownerOnly, updateSupplier); // Only Owner/Manager can update
router.delete('/:id', ownerOnly, deleteSupplier); // Only Owner/Manager can delete

export default router;
