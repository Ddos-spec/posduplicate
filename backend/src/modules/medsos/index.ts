import { Router } from 'express';
import postRoutes from './routes/post.routes';
import accountRoutes from './routes/account.routes';
import integrationHubRoutes from './routes/integrationHub.routes';

const router = Router();

router.use('/posts', postRoutes);
router.use('/accounts', accountRoutes);
router.use('/integrations', integrationHubRoutes);

export default router;
