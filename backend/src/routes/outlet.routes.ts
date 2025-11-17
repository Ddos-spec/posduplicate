import { Router } from 'express';
import {
  getOutlets,
  getOutletById,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletSettings,
  updateOutletSettings
} from '../controllers/outlet.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/outlets
 * Get all outlets (filtered by tenant)
 * Query params: is_active
 */
router.get('/', getOutlets);

/**
 * GET /api/outlets/:id
 * Get outlet by ID
 */
router.get('/:id', getOutletById);

/**
 * POST /api/outlets
 * Create new outlet
 */
router.post('/', createOutlet);

/**
 * PUT /api/outlets/:id
 * Update outlet
 */
router.put('/:id', updateOutlet);

/**
 * DELETE /api/outlets/:id
 * Deactivate outlet (soft delete)
 */
router.delete('/:id', deleteOutlet);

/**
 * GET /api/outlets/:id/settings
 * Get outlet settings
 */
router.get('/:id/settings', getOutletSettings);

/**
 * PUT /api/outlets/:id/settings
 * Update outlet settings
 */
router.put('/:id/settings', updateOutletSettings);

export default router;
