import { Router } from 'express';
import { upload } from '../../../middleware/upload';
import { uploadImage, uploadMultipleImages } from '../controllers/upload.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

// Upload single image
router.post('/image', upload.single('image'), uploadImage);

// Upload multiple images
router.post('/images', upload.array('images', 10), uploadMultipleImages);

export default router;
