import { Router } from 'express';
import postRoutes from './routes/post.routes';
import accountRoutes from './routes/account.routes';
import integrationHubRoutes from './routes/integrationHub.routes';
import metaOAuthRoutes from './routes/metaOAuth.routes';
import zernioRoutes from './routes/zernio.routes';
import mcsTeamRoutes from './routes/mcsTeam.routes';

const router = Router();

router.use('/posts', postRoutes);
router.use('/accounts', accountRoutes);
router.use('/integrations', integrationHubRoutes);
router.use('/meta-oauth', metaOAuthRoutes);
router.use('/zernio', zernioRoutes);
router.use('/team', mcsTeamRoutes);

export default router;
