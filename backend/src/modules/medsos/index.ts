import { Router } from 'express';
import postRoutes from './routes/post.routes';
import accountRoutes from './routes/account.routes';
import integrationHubRoutes from './routes/integrationHub.routes';
import metaOAuthRoutes from './routes/metaOAuth.routes';

const router = Router();

router.use('/posts', postRoutes);
router.use('/accounts', accountRoutes);
router.use('/integrations', integrationHubRoutes);
router.use('/meta-oauth', metaOAuthRoutes);

export default router;
