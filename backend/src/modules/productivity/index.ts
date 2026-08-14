import { Router } from 'express';
import productivityRoutes from './routes/productivity.p3.routes';

const router = Router();
router.use('/', productivityRoutes);

export default router;
