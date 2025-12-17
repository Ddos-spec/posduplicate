import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as journalController from '../controllers/accounting.journal.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

// Read
router.get('/', journalController.getJournals);
router.get('/:id', journalController.getJournalById);

// Write
router.post('/create', roleMiddleware(['Owner', 'Super Admin', 'Manager']), journalController.createJournal);
router.post('/:id/post', roleMiddleware(['Owner', 'Super Admin', 'Manager']), journalController.postJournal);
router.post('/:id/void', roleMiddleware(['Owner', 'Super Admin']), journalController.voidJournal);

export default router;
