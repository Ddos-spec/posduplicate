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
/**
 * @swagger
 * /api/accounting/settings:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounting settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounting settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getSettings);

/**
 * @route PUT /api/accounting/settings
 * @desc Update accounting settings (multiple sections)
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings:
 *   put:
 *     tags: [Accounting]
 *     summary: Update accounting settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/', updateSettings);

/**
 * @route POST /api/accounting/settings/reset
 * @desc Reset settings to defaults (all or specific section)
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/reset:
 *   post:
 *     tags: [Accounting]
 *     summary: Reset accounting settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings reset
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset', resetSettings);

/**
 * @route POST /api/accounting/settings/validate
 * @desc Validate settings before saving
 * @access Owner, Akuntan, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/validate:
 *   post:
 *     tags: [Accounting]
 *     summary: Validate accounting settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings validation result
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/validate', validateSettings);

/**
 * @route GET /api/accounting/settings/export
 * @desc Export settings as JSON file
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/export:
 *   get:
 *     tags: [Accounting]
 *     summary: Export accounting settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exported settings file
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/export', exportSettings);

/**
 * @route POST /api/accounting/settings/import
 * @desc Import settings from JSON file
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/import:
 *   post:
 *     tags: [Accounting]
 *     summary: Import accounting settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings imported
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/import', importSettings);

/**
 * @route GET /api/accounting/settings/accounts
 * @desc Get default accounts for mapping
 * @access Owner, Akuntan, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/accounts:
 *   get:
 *     tags: [Accounting]
 *     summary: Get default accounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default accounts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/accounts', getDefaultAccounts);

/**
 * @route GET /api/accounting/settings/roles
 * @desc Get all role settings configurations
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/roles:
 *   get:
 *     tags: [Accounting]
 *     summary: Get all role settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role settings list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/roles', getAllRoleSettings);

/**
 * @route GET /api/accounting/settings/roles/:role
 * @desc Get settings for specific role
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/roles/{role}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get role settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/roles/:role', getRoleSettings);

/**
 * @route PUT /api/accounting/settings/roles/:role
 * @desc Update settings for specific role
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/roles/{role}:
 *   put:
 *     tags: [Accounting]
 *     summary: Update role settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Role settings updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/roles/:role', updateRoleSettings);

/**
 * @route GET /api/accounting/settings/:section
 * @desc Get settings for specific section
 * @access Owner, Akuntan, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/{section}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get settings by section
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:section', getSectionSettings);

/**
 * @route PUT /api/accounting/settings/:section
 * @desc Update settings for specific section
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/settings/{section}:
 *   put:
 *     tags: [Accounting]
 *     summary: Update settings by section
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Section settings updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:section', updateSectionSettings);

export default router;
