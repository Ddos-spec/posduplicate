import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  createWebsitePage,
  createWebsiteSite,
  getPublicStorefront,
  getPublicStorefrontCatalog,
  getPublicStorefrontPage,
  getWebsiteCatalog,
  getWebsitePages,
  getWebsiteSites,
  updateWebsitePage,
  updateWebsitePageStatus,
  updateWebsiteSite,
  updateWebsiteSiteStatus,
  upsertWebsiteCatalogItem,
} from '../controllers/digital-website.p3.controller';

const router = Router();

// Public storefront: tenant is resolved exclusively through globally unique public_slug.
router.get('/storefront/:publicSlug', getPublicStorefront);
router.get('/storefront/:publicSlug/pages/:slug', getPublicStorefrontPage);
router.get('/storefront/:publicSlug/catalog', getPublicStorefrontCatalog);

router.use(authMiddleware, tenantMiddleware);

router.get('/sites', requireCapability('digital.website.read'), getWebsiteSites);
router.post('/sites', requireCapability('digital.website.manage'), createWebsiteSite);
router.put('/sites/:id', requireCapability('digital.website.manage'), updateWebsiteSite);
router.patch('/sites/:id/status', requireCapability('digital.website.manage'), updateWebsiteSiteStatus);

router.get('/sites/:siteId/pages', requireCapability('digital.website.read'), getWebsitePages);
router.post('/sites/:siteId/pages', requireCapability('digital.website.manage'), createWebsitePage);
router.put('/pages/:id', requireCapability('digital.website.manage'), updateWebsitePage);
router.patch('/pages/:id/status', requireCapability('digital.website.manage'), updateWebsitePageStatus);

router.get('/sites/:siteId/catalog', requireCapability('digital.commerce.read'), getWebsiteCatalog);
router.put('/sites/:siteId/catalog/:itemId', requireCapability('digital.commerce.manage'), upsertWebsiteCatalogItem);

export default router;
