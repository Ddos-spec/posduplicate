import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';
import {
  adjustLoyaltyWallet,
  convertQuotationToOrder,
  createOpportunity,
  createOpportunityActivity,
  createQuotation,
  getCustomer360,
  getLoyaltyWallet,
  getOpportunities,
  getQuotations,
  getRevenueSummary,
  getSalesOrders,
  moveOpportunityStage,
  updateQuotationStatus,
} from '../controllers/revenue.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/summary', getRevenueSummary);
router.get('/crm/opportunities', getOpportunities);
router.post('/crm/opportunities', createOpportunity);
router.patch('/crm/opportunities/:id/stage', moveOpportunityStage);
router.post('/crm/opportunities/:id/activities', createOpportunityActivity);

router.get('/quotations', getQuotations);
router.post('/quotations', createQuotation);
router.patch('/quotations/:id/status', ownerOnly, updateQuotationStatus);
router.post('/quotations/:id/convert', ownerOnly, convertQuotationToOrder);
router.get('/sales-orders', getSalesOrders);

router.get('/customer-360/:customerId', getCustomer360);
router.get('/loyalty/:customerId', getLoyaltyWallet);
router.post('/loyalty/:customerId/adjust', ownerOnly, adjustLoyaltyWallet);

export default router;
