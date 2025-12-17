import { Router } from 'express';
import {
  getTables,
  getAvailableTables,
  updateTableStatus,
  createTable
} from '../controllers/table.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

router.get('/', getTables);
router.get('/available', getAvailableTables);
router.post('/', createTable);
router.put('/:id/status', updateTableStatus);

export default router;
