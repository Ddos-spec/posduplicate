import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { resolvePathWithin } from '../utils/pathSecurity';

// Create uploads directory if it doesn't exist
// Use process.cwd() to ensure we always target the project root 'uploads' folder
// This works consistently across 'src' (dev) and 'dist' (prod)
const uploadsDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const tenantId = Number(req.tenantId);
      if (!Number.isInteger(tenantId) || tenantId <= 0) {
        return cb(new Error('Valid tenant context is required'), '');
      }
      const tenantDirectory = resolvePathWithin(uploadsDir, String(tenantId));
      fs.mkdirSync(tenantDirectory, { recursive: true });
      return cb(null, tenantDirectory);
    } catch (error) {
      return cb(error as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const extensionByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    const ext = extensionByMime[file.mimetype];
    if (!ext) return cb(new Error('Unsupported image type'), '');
    cb(null, `${crypto.randomBytes(24).toString('hex')}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});
