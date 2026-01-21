import { Router } from 'express';
import { getPosts, createPost, updatePost, deletePost } from '../controllers/post.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Apply Auth & Tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Routes
router.get('/', getPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;
