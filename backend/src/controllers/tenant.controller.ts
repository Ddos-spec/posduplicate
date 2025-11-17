import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { GoogleSheetService, SheetStructure } from '../services/googleSheet.service';

// Service Account Credentials from user input
const SERVICE_ACCOUNT_CREDENTIALS = {
  "type": "service_account",
  "project_id": "peroject-whatsapp",
  "private_key_id": "ee4e8f569dbd1345b6581b5edab5e2a2692ce941",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDbM4mFXYwb7fq1\n531CmR4SuvTbKHsCYVvcEjhQtv7NTXy1qz5SLWqSuI8rT3Yw7RfkraI5bfnkRsvx\nWoDjJxkBwJINCc/GyZo5KnTUzVg9WuLP0ve2oZ4lPIRyQJ7egEGKxDTnodgCzTUk\n5qnNIGbNTLg4VQ9+Qxb1O0FUn02flTDCVbeVepWvhRlvNe3+pl9QB/p8Tnxi5f/Z\nequ7sqtn0qxhZwol/TeIkUz82+FuRjvFEqCGB9qO/3699WZijXav3jSmXGyphFfBE\nLIqTYzDfFAKx/CfH7GmcA/dVkEVpwg9xCnzbEu4UGX1wlKCATivZIp2xdULSqrIM\n0vS+sGlTAgMBAAECggEAQyE05/1+p50Jj0TOFSO8VIMh8q4igdecILkJuxpXzTsC\nSsafRt52yWkxG1Px/8jUbOmKCWl3QqQ11/veBfLW0zUM5WZQVfIuw3wPnI4ojF21\noWzcBPfY7VFrxGuq27xOljdBdoCXnUAIGv1zGglmwk/RCRtvq7zTHpYfi1FgHdMr\nKxqM3YNorx9ssRjLNoByOZO4B0Qbd/zx4Yzo0qtXa1PHJFTeS7KHeZdZaby7tldz\nqMg+e08uv+1Jxq0gZqadr2hip3SXFF9M8R6v9EeFIerfQtfCeA3oy/T7HgCE42hG\nCTuuPcr/N4i8PXDVjD9LXm4rgeRbl8lTxlWEgfjagOQKBgQDugsFzrgu6xMURujHZ\nWvCzrqJkmXIJUczv9sGF/CEUFrPyxSEIgTU4X2KAg/Ix3y1EnzcS30lTQ7O+aCX4\nM2ZPZrdPq/bLVRyutHI3BPDtUZGboxlPb925u+OZJG0zsbxZWT5c0gFf38+OBOBq\npyv/A5x8BESR/uRfeA1aoLALuQKBgQDrRk+f2RE+T2r5ujAzPfhU7YNi5EgWFNLP\nGLLnz25sn6TWmeuG5Qy7PsD6UBUD6dj3jZU0t1YiVitJgeCfT7cFWLS2flHA1XDm\nlk7LSdS4nOk5m/TiFBS42A/MVpppwu0BaU/ikBcivHzbMgMP3JW/2aGbD25fprgL\nXZqJSFcbawKBgGVZGmrVYhaS1kqaG+SISA+R/V9R9KsRH0w4RjNw1315yC04pri+\nbqbtoSWK67dVZh7qqLRUPQwskIwwJTI6ZRcIRoyMPepY2D9EXeQTLW0qY/0GaRLg\nLg9mT2gbmmuE8svkqCM4+WyL5d4rJFEth/xsxGnORnTjIpeOo94GucfBAoGAVCCOmCw03vPoCQmCPHP4\nUDp1zlfeNHY4yj0N2cWQO5A8XlefIptEyxesJXREVG2XTpBjsNTT21D53o93fgDl\nl/Ub9f6CrBnuDPJe671FDv1ADRq5LwqQeCd4mi7gZKfVECPv2V1RO6TOuP0RJ8CU\n2hijIYVEBYseuHHT90GYNgY=\n-----END PRIVATE KEY-----\n",
  "client_email": "n8n-refresh-token@peroject-whatsapp.iam.gserviceaccount.com",
  "client_id": "118421492513506607479",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/n8n-refresh-token%40peroject-whatsapp.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const googleSheetService = new GoogleSheetService(SERVICE_ACCOUNT_CREDENTIALS);

const SHEETS_STRUCTURE: SheetStructure[] = [
  {
    title: 'Detail Penjualan',
    headers: [
      'Tanggal Transaksi',
      'Waktu Transaksi',
      'ID Transaksi',
      'Nama Kasir',
      'Tipe Pesanan',
      'Nama Item',
      'Varian Item',
      'Jumlah',
      'Harga Satuan',
      'Subtotal',
      'Total Diskon',
      'Total Pajak',
      'Total Akhir Transaksi',
      'Metode Pembayaran',
    ],
  },
  {
    title: 'Stok',
    headers: [
      'SKU',
      'Nama Produk / Bahan',
      'Kategori',
      'Stok Saat Ini',
      'Unit',
      'Batas Stok Minimum',
    ],
  },
  {
    title: 'Daftar Harga',
    headers: [
      'SKU',
      'Nama Item',
      'Kategori',
      'Harga Jual',
    ],
  },
  {
    title: 'Pengeluaran',
    headers: [
      'Tanggal',
      'Deskripsi Pengeluaran',
      'Kategori',
      'Jumlah',
      'Dicatat Oleh',
    ],
  },
];

/**
 * Get all tenants (Super Admin only)
 */
export const getAllTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    const where: any = { deletedAt: null };

    if (status && status !== 'all') {
      where.subscriptionStatus = status as string;
    }
    if (search) {
      where.OR = [
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { ownerName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tenants });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get single tenant by ID
 */
export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const tenant = await prisma.tenant.findUnique({
            where: { id: parseInt(id) },
        });
        if (!tenant) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
        }
        res.json({ success: true, data: tenant });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create new tenant
 */
export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessName, ownerName, email, password, phone, address } = req.body;

    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Business name, owner name, email, and password are required' },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });
      if (!ownerRole) {
        throw new Error('OWNER_ROLE_NOT_FOUND');
      }

      const now = new Date();
      const firstBillingDate = new Date();
      firstBillingDate.setMonth(firstBillingDate.getMonth() + 1);

      const tenant = await tx.tenant.create({
        data: {
          businessName,
          ownerName,
          email,
          phone,
          address,
          subscriptionPlan: 'standard',
          subscriptionStatus: 'active',
          subscriptionStartsAt: now,
          subscriptionExpiresAt: firstBillingDate,
          nextBillingDate: firstBillingDate,
          maxOutlets: 999,
          maxUsers: 999,
          features: {
            pos: true,
            inventory: true,
            reports: true,
            multiOutlet: true,
            analytics: true,
          },
        },
      });

      // Create Google Sheet for the new tenant
      let googleSheetId: string | null = null;
      try {
        googleSheetId = await googleSheetService.createSpreadsheetForOwner(ownerName, SHEETS_STRUCTURE);
        if (!googleSheetId) {
          console.warn(`Failed to create Google Sheet for owner ${ownerName}. Tenant will be created without sheet ID.`);
        }
      } catch (sheetError) {
        console.error(`Error creating Google Sheet for owner ${ownerName}:`, sheetError);
        // Decide if tenant creation should fail if sheet creation fails.
        // For now, we'll proceed with tenant creation but without a sheet ID.
      }

      // Update the tenant with the new googleSheetId
      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: { googleSheetId: googleSheetId },
      });

      const hashedPassword = await bcrypt.hash(password, 10);
      await tx.user.create({
        data: {
          name: ownerName,
          email: email,
          passwordHash: hashedPassword,
          tenantId: updatedTenant.id, // Use updatedTenant.id
          roleId: ownerRole.id,
          isActive: true,
        },
      });

      return updatedTenant;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Tenant and Owner account created successfully',
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
    }
    if (error.message === 'OWNER_ROLE_NOT_FOUND') {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_CONFIG_ERROR', message: 'Owner role is not configured in the database' },
      });
    }
    return next(error);
  }
};

/**
 * Update tenant
 */
export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.email;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activate/Deactivate tenant
 */
export const toggleTenantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });

    res.json({
      success: true,
      data: tenant,
      message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update subscription
 */
export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, expiresAt } = req.body;
    const updateData: any = {};

    if (status) {
      updateData.subscriptionStatus = status;
    }
    if (expiresAt) {
      updateData.subscriptionExpiresAt = new Date(expiresAt);
    }

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current tenant info (for logged-in tenant admin)
 */
export const getMyTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: { code: 'NO_TENANT', message: 'No tenant associated with this user' } });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: {
        _count: {
          select: {
            outlets: true,
            users: true,
          },
        },
      },
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete tenant (soft delete)
 */
export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = parseInt(id);

    // First, find the tenant to get their Google Sheet ID
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleSheetId: true },
    });

    // If tenant exists and has a sheet ID, delete the sheet
    if (tenant && tenant.googleSheetId) {
      await googleSheetService.deleteSpreadsheet(tenant.googleSheetId);
    }

    // Then, perform the soft delete
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    return next(error);
  }
};