import { Router } from 'express';
import learningCommunityRoutes from './routes/learningCommunity.p3.routes';

const router = Router();
router.use('/', learningCommunityRoutes);

export default router;
