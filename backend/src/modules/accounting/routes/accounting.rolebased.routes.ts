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
router.get('/owner', getOwnerDashboard);

/**
 * @route GET /api/accounting/dashboard/akuntan
 * @desc Get accountant dashboard with journal and reconciliation focus
 * @access Akuntan, Owner, Admin
 */
router.get('/akuntan', getAkuntanDashboard);

/**
 * @route GET /api/accounting/dashboard/produsen
 * @desc Get manufacturer dashboard with production and cost focus
 * @access Produsen, Owner, Admin
 */
router.get('/produsen', getProdusenDashboard);

/**
 * @route GET /api/accounting/dashboard/distributor
 * @desc Get distributor dashboard with purchasing and inventory focus
 * @access Distributor, Owner, Admin
 */
router.get('/distributor', getDistributorDashboard);

/**
 * @route GET /api/accounting/dashboard/kasir
 * @desc Get cashier dashboard with daily sales and shift focus
 * @access Kasir, Owner, Admin
 */
router.get('/kasir', getKasirDashboard);

/**
 * @route GET /api/accounting/dashboard/retail
 * @desc Get retail dashboard with sales performance and margin focus
 * @access Retail, Owner, Admin
 */
router.get('/retail', getRetailDashboard);

/**
 * @route GET /api/accounting/dashboard/me
 * @desc Get dashboard based on current user's role
 * @access All authenticated users
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
