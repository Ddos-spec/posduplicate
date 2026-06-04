import { Router } from 'express';
import postRoutes from './routes/post.routes';
import accountRoutes from './routes/account.routes';
import integrationHubRoutes from './routes/integrationHub.routes';
import logisticsRoutes from './routes/logistics.routes';
import contentStudioRoutes from './routes/contentStudio.routes';
import metaOAuthRoutes from './routes/metaOAuth.routes';
import tiktokAdsRoutes from './routes/tiktokAds.routes';
import zernioRoutes from './routes/zernio.routes';
import mcsTeamRoutes from './routes/mcsTeam.routes';

const router = Router();

router.use('/posts', postRoutes);
router.use('/accounts', accountRoutes);
router.use('/integrations', integrationHubRoutes);
router.use('/logistics', logisticsRoutes);
router.use('/content-studio', contentStudioRoutes);
router.use('/meta-oauth', metaOAuthRoutes);
router.use('/tiktok', tiktokAdsRoutes);
router.use('/zernio', zernioRoutes);
router.use('/team', mcsTeamRoutes);

export default router;

