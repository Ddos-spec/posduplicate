import { Router } from 'express';
import postRoutes from './routes/post.routes';
import accountRoutes from './routes/account.routes';

const router = Router();

router.use('/posts', postRoutes);
router.use('/accounts', accountRoutes);

export default router;
