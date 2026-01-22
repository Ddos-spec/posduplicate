import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Document Attachment System Controller
 * Handles file uploads for accounting documents
 *
 * Features:
 * - Attach files to invoices, journals, transactions
 * - Support for multiple file types (PDF, images, Excel)
 * - Secure storage with hash verification
 * - Version control for documents
 * - Bulk upload support
 * - Preview and download
 */

// ============= TYPES =============

type DocumentType = 'invoice' | 'journal' | 'transaction' | 'faktur' | 'bukti_potong' | 'reconciliation' | 'asset' | 'budget';

// Allowed file types
const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/csv': '.csv'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============= UPLOAD ATTACHMENTS =============

/**
 * Upload attachment(s) for a document
 */
export const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { documentType, documentId } = req.body;
    const files = (req as any).files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: 'Tidak ada file yang diupload' }
      });
    }

    if (!documentType || !documentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'documentType dan documentId wajib diisi' }
      });
    }

    // Validate document type
    const validTypes = ['invoice', 'journal', 'transaction', 'faktur', 'bukti_potong', 'reconciliation', 'asset', 'budget'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'documentType tidak valid' }
      });
    }

    const uploadedFiles: any[] = [];
    const errors: any[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES[file.mimetype as keyof typeof ALLOWED_TYPES]) {
        errors.push({ file: file.originalname, error: 'Tipe file tidak diizinkan' });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ file: file.originalname, error: 'Ukuran file melebihi 10MB' });
        continue;
      }

      // Calculate file hash
      const fileBuffer = fs.readFileSync(file.path);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check for duplicate
      const existing: any[] = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, version FROM "accounting"."document_attachments"
        WHERE tenant_id = ${tenantId}
        AND document_type = '${documentType}'
        AND document_id = ${documentId}
        AND hash = '${hash}'
      `).catch(() => []);

      if (existing.length > 0) {
        errors.push({ file: file.originalname, error: 'File sudah pernah diupload' });
        // Clean up duplicate file
        fs.unlinkSync(file.path);
        continue;
      }

      // Get next version
      const lastVersion: any[] = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COALESCE(MAX(version), 0) as max_version FROM "accounting"."document_attachments"
        WHERE tenant_id = ${tenantId}
        AND document_type = '${documentType}'
        AND document_id = ${documentId}
        AND original_name = '${file.originalname.replace(/'/g, "''")}'
      `).catch(() => [{ max_version: 0 }]);

      const version = Number(lastVersion[0]?.max_version || 0) + 1;

      // Move to accounting attachments folder
      const attachmentDir = path.join(process.cwd(), 'uploads', 'accounting', documentType, documentId.toString());
      if (!fs.existsSync(attachmentDir)) {
        fs.mkdirSync(attachmentDir, { recursive: true });
      }

      const newFileName = `${Date.now()}-v${version}-${file.originalname}`;
      const newPath = path.join(attachmentDir, newFileName);
      fs.renameSync(file.path, newPath);

      // Store relative path
      const relativePath = path.join('uploads', 'accounting', documentType, documentId.toString(), newFileName);

      // Save to database
      await prisma.$executeRawUnsafe(`
        INSERT INTO "accounting"."document_attachments"
        (tenant_id, document_type, document_id, file_name, original_name, mime_type,
         size, hash, version, path, uploaded_by, created_at)
        VALUES
        (${tenantId}, '${documentType}', ${documentId}, '${newFileName}',
         '${file.originalname.replace(/'/g, "''")}', '${file.mimetype}',
         ${file.size}, '${hash}', ${version}, '${relativePath}', ${userId}, NOW())
      `).catch(async () => {
        await createAttachmentTable();
      });

      uploadedFiles.push({
        fileName: newFileName,
        originalName: file.originalname,
        size: file.size,
        version,
        mimeType: file.mimetype
      });
    }

    res.status(201).json({
      success: true,
      data: {
        uploaded: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `${uploadedFiles.length} file berhasil diupload`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attachments for a document
 */
export const getAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { documentType, documentId } = req.params;

    const attachments: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        a.*,
        u.name as uploaded_by_name
      FROM "accounting"."document_attachments" a
      LEFT JOIN "users" u ON a.uploaded_by = u.id
      WHERE a.tenant_id = ${tenantId}
      AND a.document_type = '${documentType}'
      AND a.document_id = ${documentId}
      AND a.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `).catch(() => []);

    res.json({
      success: true,
      data: attachments.map(a => ({
        id: a.id,
        fileName: a.file_name,
        originalName: a.original_name,
        mimeType: a.mime_type,
        size: formatFileSize(a.size),
        sizeBytes: a.size,
        version: a.version,
        uploadedBy: a.uploaded_by_name,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download attachment
 */
export const downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { attachmentId } = req.params;

    const attachment: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "accounting"."document_attachments"
      WHERE id = ${attachmentId}
      AND tenant_id = ${tenantId}
      AND deleted_at IS NULL
    `).catch(() => []);

    if (attachment.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment tidak ditemukan' }
      });
    }

    const filePath = path.join(process.cwd(), attachment[0].path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File tidak ditemukan di server' }
      });
    }

    // Log download
    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."attachment_logs"
      (tenant_id, attachment_id, action, user_id, created_at)
      VALUES (${tenantId}, ${attachmentId}, 'download', ${(req as any).userId}, NOW())
    `).catch(() => {});

    res.download(filePath, attachment[0].original_name);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attachment (soft delete)
 */
export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { attachmentId } = req.params;

    const attachment: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "accounting"."document_attachments"
      WHERE id = ${attachmentId}
      AND tenant_id = ${tenantId}
      AND deleted_at IS NULL
    `).catch(() => []);

    if (attachment.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment tidak ditemukan' }
      });
    }

    // Soft delete
    await prisma.$executeRawUnsafe(`
      UPDATE "accounting"."document_attachments"
      SET deleted_at = NOW(), deleted_by = ${userId}
      WHERE id = ${attachmentId}
    `);

    // Log deletion
    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."attachment_logs"
      (tenant_id, attachment_id, action, user_id, created_at)
      VALUES (${tenantId}, ${attachmentId}, 'delete', ${userId}, NOW())
    `).catch(() => {});

    res.json({
      success: true,
      message: 'Attachment berhasil dihapus'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all attachments for tenant (with filters)
 */
export const getAllAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { documentType, startDate, endDate, page = 1, limit = 20 } = req.query;

    let whereClause = `WHERE a.tenant_id = ${tenantId} AND a.deleted_at IS NULL`;

    if (documentType) whereClause += ` AND a.document_type = '${documentType}'`;
    if (startDate) whereClause += ` AND a.created_at >= '${startDate}'`;
    if (endDate) whereClause += ` AND a.created_at <= '${endDate}'`;

    const offset = (Number(page) - 1) * Number(limit);

    const attachments: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        a.*,
        u.name as uploaded_by_name
      FROM "accounting"."document_attachments" a
      LEFT JOIN "users" u ON a.uploaded_by = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `).catch(() => []);

    const total: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "accounting"."document_attachments" a ${whereClause}
    `).catch(() => [{ count: 0 }]);

    // Calculate storage usage
    const storage: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(size), 0) as total_size,
        COUNT(*) as total_files
      FROM "accounting"."document_attachments"
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
    `).catch(() => [{ total_size: 0, total_files: 0 }]);

    res.json({
      success: true,
      data: {
        attachments: attachments.map(a => ({
          id: a.id,
          documentType: a.document_type,
          documentId: a.document_id,
          fileName: a.file_name,
          originalName: a.original_name,
          mimeType: a.mime_type,
          size: formatFileSize(a.size),
          version: a.version,
          uploadedBy: a.uploaded_by_name,
          createdAt: a.created_at
        })),
        storage: {
          totalSize: formatFileSize(Number(storage[0]?.total_size || 0)),
          totalSizeBytes: Number(storage[0]?.total_size || 0),
          totalFiles: Number(storage[0]?.total_files || 0)
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total[0]?.count || 0),
          totalPages: Math.ceil(Number(total[0]?.count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attachment versions
 */
export const getAttachmentVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { documentType, documentId, originalName } = req.params;

    const versions: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        a.*,
        u.name as uploaded_by_name
      FROM "accounting"."document_attachments" a
      LEFT JOIN "users" u ON a.uploaded_by = u.id
      WHERE a.tenant_id = ${tenantId}
      AND a.document_type = '${documentType}'
      AND a.document_id = ${documentId}
      AND a.original_name = '${originalName.replace(/'/g, "''")}'
      ORDER BY a.version DESC
    `).catch(() => []);

    res.json({
      success: true,
      data: versions.map(v => ({
        id: v.id,
        version: v.version,
        size: formatFileSize(v.size),
        uploadedBy: v.uploaded_by_name,
        createdAt: v.created_at,
        isLatest: v.version === Math.max(...versions.map(x => x.version)),
        isDeleted: v.deleted_at !== null
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk upload for multiple documents
 */
export const bulkUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { mappings } = req.body; // Array of { fileName, documentType, documentId }
    const files = (req as any).files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: 'Tidak ada file yang diupload' }
      });
    }

    if (!mappings || !Array.isArray(mappings)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Mapping dokumen wajib diisi' }
      });
    }

    const results: any[] = [];

    for (const file of files) {
      const mapping = mappings.find((m: any) => m.fileName === file.originalname);

      if (!mapping) {
        results.push({
          file: file.originalname,
          status: 'error',
          message: 'Tidak ada mapping untuk file ini'
        });
        fs.unlinkSync(file.path);
        continue;
      }

      try {
        // Process upload
        const fileBuffer = fs.readFileSync(file.path);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const attachmentDir = path.join(process.cwd(), 'uploads', 'accounting', mapping.documentType, mapping.documentId.toString());
        if (!fs.existsSync(attachmentDir)) {
          fs.mkdirSync(attachmentDir, { recursive: true });
        }

        const newFileName = `${Date.now()}-${file.originalname}`;
        const newPath = path.join(attachmentDir, newFileName);
        fs.renameSync(file.path, newPath);

        const relativePath = path.join('uploads', 'accounting', mapping.documentType, mapping.documentId.toString(), newFileName);

        await prisma.$executeRawUnsafe(`
          INSERT INTO "accounting"."document_attachments"
          (tenant_id, document_type, document_id, file_name, original_name, mime_type,
           size, hash, version, path, uploaded_by, created_at)
          VALUES
          (${tenantId}, '${mapping.documentType}', ${mapping.documentId}, '${newFileName}',
           '${file.originalname.replace(/'/g, "''")}', '${file.mimetype}',
           ${file.size}, '${hash}', 1, '${relativePath}', ${userId}, NOW())
        `);

        results.push({
          file: file.originalname,
          status: 'success',
          documentType: mapping.documentType,
          documentId: mapping.documentId
        });
      } catch (err) {
        results.push({
          file: file.originalname,
          status: 'error',
          message: 'Gagal mengupload file'
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        results,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function createAttachmentTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."document_attachments" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      document_type VARCHAR(50) NOT NULL,
      document_id INTEGER NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100),
      size BIGINT DEFAULT 0,
      hash VARCHAR(64),
      version INTEGER DEFAULT 1,
      path TEXT NOT NULL,
      uploaded_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      deleted_by INTEGER
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_attachments_document
    ON "accounting"."document_attachments" (tenant_id, document_type, document_id)
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."attachment_logs" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      attachment_id INTEGER NOT NULL,
      action VARCHAR(20) NOT NULL,
      user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}
