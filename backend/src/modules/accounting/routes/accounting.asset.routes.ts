import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as assetController from '../controllers/accounting.asset.controller';

const router = Router();

// Fixed Assets CRUD
router.get('/', assetController.getAssets);
router.get('/depreciation-history', assetController.getDepreciationHistory);
router.get('/:id', assetController.getAssetById);
router.post('/', roleMiddleware(['Owner', 'Super Admin']), assetController.createAsset);
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin']), assetController.updateAsset);
router.post('/:id/depreciate', roleMiddleware(['Owner', 'Super Admin']), assetController.runDepreciation);
router.post('/:id/dispose', roleMiddleware(['Owner', 'Super Admin']), assetController.disposeAsset);

// Bulk depreciation
router.post('/depreciate-all', roleMiddleware(['Owner', 'Super Admin']), assetController.runMonthlyDepreciation);

export default router;
