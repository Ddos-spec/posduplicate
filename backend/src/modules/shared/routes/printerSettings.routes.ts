import { Router } from 'express';
import {
  getPrinterSettings,
  updatePrinterSettings,
  resetPrinterSettings,
} from '../controllers/printerSettings.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/printer-settings:
 *   get:
 *     tags: [Printer Settings]
 *     summary: Get printer settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Printer settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getPrinterSettings);
/**
 * @swagger
 * /api/printer-settings:
 *   put:
 *     tags: [Printer Settings]
 *     summary: Update printer settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Printer settings updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/', updatePrinterSettings);
/**
 * @swagger
 * /api/printer-settings/reset:
 *   post:
 *     tags: [Printer Settings]
 *     summary: Reset printer settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Printer settings reset
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset', resetPrinterSettings);

export default router;
