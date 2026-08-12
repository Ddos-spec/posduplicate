import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
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

router.get('/summary', requireCapability('revenue.sales.read'), getRevenueSummary);
router.get('/crm/opportunities', requireCapability('revenue.crm.read'), getOpportunities);
router.post('/crm/opportunities', requireCapability('revenue.crm.manage'), createOpportunity);
router.patch('/crm/opportunities/:id/stage', requireCapability('revenue.crm.manage'), moveOpportunityStage);
router.post('/crm/opportunities/:id/activities', requireCapability('revenue.crm.manage'), createOpportunityActivity);

router.get('/quotations', requireCapability('revenue.sales.read'), getQuotations);
router.post('/quotations', requireCapability('revenue.sales.manage'), createQuotation);
router.patch('/quotations/:id/status', requireCapability('revenue.sales.manage'), updateQuotationStatus);
router.post('/quotations/:id/convert', requireCapability('revenue.sales.manage'), convertQuotationToOrder);
router.get('/sales-orders', requireCapability('revenue.sales.read'), getSalesOrders);

router.get('/customer-360/:customerId', requireCapability('revenue.customer360.read'), getCustomer360);
router.get('/loyalty/:customerId', requireCapability('revenue.loyalty.read'), getLoyaltyWallet);
router.post('/loyalty/:customerId/adjust', requireCapability('revenue.loyalty.adjust'), adjustLoyaltyWallet);

export default router;
