import { Request, Response, NextFunction } from 'express';

/**
 * Upload single image
 */
export const uploadImage = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    // Return the file URL
    const fileUrl = `/uploads/${req.file.filename}`;

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
) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded'
        }
      });
    }

    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
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
