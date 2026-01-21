import { Router } from 'express';
import postRoutes from './routes/post.routes';

const router = Router();

router.use('/posts', postRoutes);
// router.use('/accounts', accountRoutes); // To be implemented

export default router;
