import express from 'express';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { auditLogger } from '../middlewares/audit.middleware';
import * as userController from '../controllers/accounting.user.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

router.get('/', roleMiddleware(['Owner', 'Super Admin', 'Manager']), userController.getUsers);
router.post('/create', roleMiddleware(['Owner', 'Super Admin']), userController.createUser);
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin']), userController.updateUser);
router.delete('/:id', roleMiddleware(['Owner', 'Super Admin']), userController.deleteUser);

export default router;
