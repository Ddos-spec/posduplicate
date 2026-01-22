import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
  getAllAttachments,
  getAttachmentVersions,
  bulkUpload
} from '../controllers/accounting.attachment.controller';

const router = Router();

// Configure multer for accounting attachments
const uploadsDir = path.join(process.cwd(), 'uploads', 'accounting', 'temp');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak diizinkan. Gunakan PDF, gambar, Excel, Word, atau CSV.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Apply auth and tenant middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// Upload attachment(s)
/**
 * @swagger
 * /api/accounting/attachments/upload:
 *   post:
 *     tags: [Accounting]
 *     summary: Upload accounting attachments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Attachments uploaded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.array('files', 10), uploadAttachment);

// Bulk upload with mappings
/**
 * @swagger
 * /api/accounting/attachments/bulk-upload:
 *   post:
 *     tags: [Accounting]
 *     summary: Bulk upload attachments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Bulk upload completed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bulk-upload', upload.array('files', 50), bulkUpload);

// Get all attachments (with filters)
/**
 * @swagger
 * /api/accounting/attachments:
 *   get:
 *     tags: [Accounting]
 *     summary: Get all attachments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attachment list
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
router.get('/', getAllAttachments);

// Get attachments for a document
/**
 * @swagger
 * /api/accounting/attachments/{documentType}/{documentId}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get attachments for a document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document attachments
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
router.get('/:documentType/:documentId', getAttachments);

// Get attachment versions
/**
 * @swagger
 * /api/accounting/attachments/{documentType}/{documentId}/versions/{originalName}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get attachment versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: originalName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment versions
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
router.get('/:documentType/:documentId/versions/:originalName', getAttachmentVersions);

// Download attachment
/**
 * @swagger
 * /api/accounting/attachments/download/{attachmentId}:
 *   get:
 *     tags: [Accounting]
 *     summary: Download attachment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attachment file
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/download/:attachmentId', downloadAttachment);

// Delete attachment
/**
 * @swagger
 * /api/accounting/attachments/{attachmentId}:
 *   delete:
 *     tags: [Accounting]
 *     summary: Delete attachment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attachment deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:attachmentId', deleteAttachment);

export default router;
