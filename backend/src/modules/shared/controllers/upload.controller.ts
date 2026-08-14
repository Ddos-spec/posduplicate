import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';

const detectImageMime = (buffer: Buffer): string | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  return null;
};

const validateUploadedImage = async (file: Express.Multer.File): Promise<boolean> => {
  const handle = await fs.open(file.path, 'r');
  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const detected = detectImageMime(header.subarray(0, bytesRead));
    const declared = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
    return detected !== null && detected === declared;
  } finally {
    await handle.close();
  }
};

/**
 * Upload single image
 */
export const uploadImage = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
      return;
    }
    if (!(await validateUploadedImage(req.file))) {
      await fs.unlink(req.file.path).catch(() => undefined);
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_SIGNATURE', message: 'File content does not match an allowed image format' }
      });
      return;
    }

    // Return the file URL
    const fileUrl = `/uploads/${req.tenantId}/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Upload multiple images
 */
export const uploadMultipleImages = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded'
        }
      });
      return;
    }
    const validationResults = await Promise.all(files.map(validateUploadedImage));
    if (validationResults.some((valid) => !valid)) {
      await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_SIGNATURE', message: 'One or more files are not valid images' }
      });
      return;
    }

    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${req.tenantId}/${file.filename}`
    }));

    res.json({
      success: true,
      data: uploadedFiles,
      message: `${files.length} file(s) uploaded successfully`
    });
  } catch (error) {
    _next(error);
  }
};
