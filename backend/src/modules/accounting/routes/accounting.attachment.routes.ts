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
router.post('/upload', upload.array('files', 10), uploadAttachment);

// Bulk upload with mappings
router.post('/bulk-upload', upload.array('files', 50), bulkUpload);

// Get all attachments (with filters)
router.get('/', getAllAttachments);

// Get attachments for a document
router.get('/:documentType/:documentId', getAttachments);

// Get attachment versions
router.get('/:documentType/:documentId/versions/:originalName', getAttachmentVersions);

// Download attachment
router.get('/download/:attachmentId', downloadAttachment);

// Delete attachment
router.delete('/:attachmentId', deleteAttachment);

export default router;
