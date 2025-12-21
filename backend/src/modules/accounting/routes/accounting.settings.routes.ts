import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  getSettings,
  updateSettings,
  getSectionSettings,
  updateSectionSettings,
  getRoleSettings,
  getAllRoleSettings,
  updateRoleSettings,
  resetSettings,
  getDefaultAccounts,
  validateSettings,
  exportSettings,
  importSettings
} from '../controllers/accounting.settings.controller';

const router = express.Router();

// All routes require authentication and tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @route GET /api/accounting/settings
 * @desc Get all accounting settings
 * @access Owner, Akuntan, Admin
 */
router.get('/', getSettings);

/**
 * @route PUT /api/accounting/settings
 * @desc Update accounting settings (multiple sections)
 * @access Owner, Admin
 */
router.put('/', updateSettings);

/**
 * @route POST /api/accounting/settings/reset
 * @desc Reset settings to defaults (all or specific section)
 * @access Owner, Admin
 */
router.post('/reset', resetSettings);

/**
 * @route POST /api/accounting/settings/validate
 * @desc Validate settings before saving
 * @access Owner, Akuntan, Admin
 */
router.post('/validate', validateSettings);

/**
 * @route GET /api/accounting/settings/export
 * @desc Export settings as JSON file
 * @access Owner, Admin
 */
router.get('/export', exportSettings);

/**
 * @route POST /api/accounting/settings/import
 * @desc Import settings from JSON file
 * @access Owner, Admin
 */
router.post('/import', importSettings);

/**
 * @route GET /api/accounting/settings/accounts
 * @desc Get default accounts for mapping
 * @access Owner, Akuntan, Admin
 */
router.get('/accounts', getDefaultAccounts);

/**
 * @route GET /api/accounting/settings/roles
 * @desc Get all role settings configurations
 * @access Owner, Admin
 */
router.get('/roles', getAllRoleSettings);

/**
 * @route GET /api/accounting/settings/roles/:role
 * @desc Get settings for specific role
 * @access Owner, Admin
 */
router.get('/roles/:role', getRoleSettings);

/**
 * @route PUT /api/accounting/settings/roles/:role
 * @desc Update settings for specific role
 * @access Owner, Admin
 */
router.put('/roles/:role', updateRoleSettings);

/**
 * @route GET /api/accounting/settings/:section
 * @desc Get settings for specific section
 * @access Owner, Akuntan, Admin
 */
router.get('/:section', getSectionSettings);

/**
 * @route PUT /api/accounting/settings/:section
 * @desc Update settings for specific section
 * @access Owner, Admin
 */
router.put('/:section', updateSectionSettings);

export default router;
