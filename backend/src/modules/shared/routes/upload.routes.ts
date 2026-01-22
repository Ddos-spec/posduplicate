import { Router } from 'express';
import { upload } from '../../../middleware/upload';
import { uploadImage, uploadMultipleImages } from '../controllers/upload.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

// Upload single image
/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload single image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/image', upload.single('image'), uploadImage);

// Upload multiple images
/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload multiple images
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Images uploaded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/images', upload.array('images', 10), uploadMultipleImages);

export default router;
