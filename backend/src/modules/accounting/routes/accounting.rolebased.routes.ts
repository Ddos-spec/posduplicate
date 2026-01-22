import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  getOwnerDashboard,
  getAkuntanDashboard,
  getProdusenDashboard,
  getDistributorDashboard,
  getKasirDashboard,
  getRetailDashboard
} from '../controllers/accounting.rolebased.controller';

const router = express.Router();

// All routes require authentication and tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @route GET /api/accounting/dashboard/owner
 * @desc Get owner dashboard with comprehensive financial overview
 * @access Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/owner:
 *   get:
 *     tags: [Accounting]
 *     summary: Get owner role-based dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner dashboard data
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
router.get('/owner', getOwnerDashboard);

/**
 * @route GET /api/accounting/dashboard/akuntan
 * @desc Get accountant dashboard with journal and reconciliation focus
 * @access Akuntan, Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/akuntan:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accountant role-based dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accountant dashboard data
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
router.get('/akuntan', getAkuntanDashboard);

/**
 * @route GET /api/accounting/dashboard/produsen
 * @desc Get manufacturer dashboard with production and cost focus
 * @access Produsen, Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/produsen:
 *   get:
 *     tags: [Accounting]
 *     summary: Get produsen role-based dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Produsen dashboard data
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
router.get('/produsen', getProdusenDashboard);

/**
 * @route GET /api/accounting/dashboard/distributor
 * @desc Get distributor dashboard with purchasing and inventory focus
 * @access Distributor, Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/distributor:
 *   get:
 *     tags: [Accounting]
 *     summary: Get distributor role-based dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distributor dashboard data
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
router.get('/distributor', getDistributorDashboard);

/**
 * @route GET /api/accounting/dashboard/kasir
 * @desc Get cashier dashboard with daily sales and shift focus
 * @access Kasir, Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/kasir:
 *   get:
 *     tags: [Accounting]
 *     summary: Get cashier role-based dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cashier dashboard data
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
router.get('/kasir', getKasirDashboard);

/**
 * @route GET /api/accounting/dashboard/retail
 * @desc Get retail dashboard with sales performance and margin focus
 * @access Retail, Owner, Admin
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/retail:
 *   get:
 *     tags: [Accounting]
 *     summary: Get retail role-based dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retail dashboard data
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
router.get('/retail', getRetailDashboard);

/**
 * @route GET /api/accounting/dashboard/me
 * @desc Get dashboard based on current user's role
 * @access All authenticated users
 */
/**
 * @swagger
 * /api/accounting/dashboard/role/me:
 *   get:
 *     tags: [Accounting]
 *     summary: Get dashboard for current role
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role-based dashboard data
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
router.get('/me', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Get user's role
    const userId = (req as any).userId;
    const prisma = (await import('../../../utils/prisma')).default;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { roles: { select: { name: true } } }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const roleName = user.roles?.name?.toLowerCase() || 'retail';

    // Route to appropriate dashboard based on role
    switch (roleName) {
      case 'owner':
      case 'admin':
      case 'super admin':
        return getOwnerDashboard(req, res, next);
      case 'akuntan':
      case 'accountant':
        return getAkuntanDashboard(req, res, next);
      case 'produsen':
      case 'manufacturer':
        return getProdusenDashboard(req, res, next);
      case 'distributor':
        return getDistributorDashboard(req, res, next);
      case 'kasir':
      case 'cashier':
        return getKasirDashboard(req, res, next);
      case 'retail':
      default:
        return getRetailDashboard(req, res, next);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
