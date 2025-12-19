import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as reconController from '../controllers/accounting.reconciliation.controller';

const router = Router();

// Bank Reconciliation CRUD
router.get('/', reconController.getReconciliations);
router.get('/unmatched-gl', reconController.getUnmatchedGLEntries);
router.get('/:id', reconController.getReconciliationById);
router.post('/', roleMiddleware(['Owner', 'Super Admin', 'Manager']), reconController.createReconciliation);
router.post('/:id/detail', roleMiddleware(['Owner', 'Super Admin', 'Manager']), reconController.addReconciliationDetail);
router.patch('/:id/detail/:detailId/match', roleMiddleware(['Owner', 'Super Admin', 'Manager']), reconController.matchDetailToJournal);
router.post('/:id/complete', roleMiddleware(['Owner', 'Super Admin']), reconController.completeReconciliation);
router.delete('/:id', roleMiddleware(['Owner', 'Super Admin']), reconController.deleteReconciliation);

export default router;
