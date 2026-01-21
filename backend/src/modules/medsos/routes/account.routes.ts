import { Router } from 'express';
import { getAccounts, connectAccount, disconnectAccount } from '../controllers/account.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/', getAccounts);
router.post('/connect', connectAccount);
router.delete('/:id', disconnectAccount);

export default router;
