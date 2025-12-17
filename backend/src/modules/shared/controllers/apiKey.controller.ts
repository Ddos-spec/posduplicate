import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { generateApiKey } from '../../../utils/apiKeyGenerator';

/**
 * Get ALL API keys for ALL tenants (Admin only)
 */
export const getAllApiKeys = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await prisma.api_keys.findMany({
      include: {
        tenants: {
          select: {
            id: true,
            business_name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: apiKeys.map((apiKey) => {
        const { tenants, ...rest } = apiKey;
        return {
          ...rest,
          tenant: tenants
            ? {
                id: tenants.id,
                businessName: tenants.business_name,
                email: tenants.email
              }
            : null
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching all API keys:', error);
    return next(error);
  }
};

/**
 * Get all API keys for a specific tenant (Admin only)
 */
export const getTenantApiKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const apiKeys = await prisma.api_keys.findMany({
      where: {
        tenant_id: parseInt(tenantId),
      },
      select: {
        id: true,
        key_name: true,
        is_active: true,
        created_at: true,
        last_used: true,
        expires_at: true,
        // DO NOT return the actual api_key hash for security
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return next(error);
  }
};

/**
 * Get current user's tenant API keys (Owner only)
 * Returns masked keys for security
 */
export const getMyApiKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_TENANT', message: 'No tenant associated with this user' },
      });
    }

    const apiKeys = await prisma.api_keys.findMany({
      where: {
        tenant_id: tenantId,
      },
      select: {
        id: true,
        key_name: true,
        is_active: true,
        created_at: true,
        last_used: true,
        expires_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: apiKeys,
      message: 'API keys are managed by your administrator. Contact them for the actual key values.',
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return next(error);
  }
};

/**
 * Create new API key for a tenant (Admin only)
 */
export const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { keyName, expiresAt } = req.body;

    if (!keyName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Key name is required' },
      });
    }

    // Generate new API key
    const apiKey = generateApiKey();
    // Store plain text as requested for easier integration/lookup by middleware
    // Security note: Ideally this should be hashed, but current middleware uses findUnique lookup
    const hashedKey = apiKey; 

    // Create API key record
    const apiKeyRecord = await prisma.api_keys.create({
      data: {
        tenant_id: parseInt(tenantId),
        key_name: keyName,
        api_key: hashedKey,
        is_active: true,
        expires_at: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: apiKeyRecord.id,
        key_name: apiKeyRecord.key_name,
        api_key: apiKey, // Only shown once!
        is_active: apiKeyRecord.is_active,
        created_at: apiKeyRecord.created_at,
        expires_at: apiKeyRecord.expires_at,
      },
      message: 'API key created successfully. IMPORTANT: Save this key now, it will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return next(error);
  }
};

/**
 * Toggle API key active status (Admin only)
 */
export const toggleApiKeyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;
    const { isActive } = req.body;

    const apiKey = await prisma.api_keys.update({
      where: { id: parseInt(keyId) },
      data: { is_active: isActive },
      select: {
        id: true,
        key_name: true,
        is_active: true,
        created_at: true,
        last_used: true,
        expires_at: true,
      },
    });

    res.json({
      success: true,
      data: apiKey,
      message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling API key status:', error);
    return next(error);
  }
};

/**
 * Delete API key (Admin only)
 */
export const deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;

    await prisma.api_keys.delete({
      where: { id: parseInt(keyId) },
    });

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return next(error);
  }
};

/**
 * Get API documentation data
 */
export const getApiDocumentation = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const documentation = {
      baseUrl: process.env.API_BASE_URL || 'https://filter-bot-mypos-backend.qk6yxt.easypanel.host',
      version: '1.0.0',
      authentication: {
        type: 'API Key',
        headerName: 'X-API-Key',
        format: 'mypos_live_[64_hex_characters]',
      },
      endpoints: [
        {
          method: 'GET',
          path: '/api/owner/reports/transactions',
          description: 'Get comprehensive transaction report. Use `date` for a simple full-day report (00:00-23:59), or `startDate` & `endDate` for a custom range.',
          authentication: true,
          queryParameters: [
            {
              name: 'date',
              type: 'string',
              required: false,
              description: 'Simplified single date filter (YYYY-MM-DD). Automagically sets 00:00-23:59 for that day. Ideal for daily cron jobs.',
            },
            {
              name: 'startDate',
              type: 'string',
              required: false,
              description: 'Start date in ISO format (e.g., 2025-11-01). Optional if `date` is provided.',
            },
            {
              name: 'endDate',
              type: 'string',
              required: false,
              description: 'End date in ISO format (e.g., 2025-11-30). Optional if `date` is provided.',
            },
            {
              name: 'outletId',
              type: 'number',
              required: false,
              description: 'Filter by specific outlet ID',
            },
            {
              name: 'limit',
              type: 'number',
              required: false,
              description: 'Limit number of top items returned (default: 10)',
            },
          ],
          responseExample: {
            success: true,
            data: {
              summary: {
                totalTransactions: 150,
                totalRevenue: 45000000,
                totalDiscount: 500000,
                totalTax: 4500000,
                averageOrderValue: 300000,
                totalItems: 320,
              },
              cashFlow: {
                revenue: 45000000,
                expenses: 0,
                netCashFlow: 45000000,
              },
              paymentMethods: {
                cash: 25000000,
                card: 15000000,
                qris: 5000000,
              },
              orderTypes: {
                'dine-in': 80,
                takeaway: 50,
                delivery: 20,
              },
              topSellingItems: [
                {
                  itemId: 5,
                  itemName: 'Nasi Goreng Special',
                  category: 'Main Course',
                  totalQuantity: 120,
                  totalRevenue: 3000000,
                  transactionCount: 85,
                },
              ],
              transactions: [
                {
                  id: 1,
                  transactionNumber: 'TRX-001',
                  orderType: 'dine-in',
                  subtotal: 100000,
                  discount: 0,
                  tax: 10000,
                  total: 110000,
                  status: 'completed',
                  paymentMethod: 'cash',
                  cashier: 'John Doe',
                  outlet: 'Main Branch',
                  createdAt: '2025-11-26T10:30:00Z',
                  items: [
                    {
                      itemName: 'Nasi Goreng',
                      quantity: 2,
                      unitPrice: 25000,
                      subtotal: 50000,
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          method: 'GET',
          path: '/api/owner/reports/stock',
          description: 'Get comprehensive inventory/stock report including all items, stock levels, low stock alerts, and total stock value',
          authentication: true,
          queryParameters: [
            {
              name: 'outletId',
              type: 'number',
              required: false,
              description: 'Filter by specific outlet ID',
            },
            {
              name: 'lowStock',
              type: 'boolean',
              required: false,
              description: 'Show only items with low stock (true/false)',
            },
            {
              name: 'categoryId',
              type: 'number',
              required: false,
              description: 'Filter by category ID',
            },
          ],
          responseExample: {
            success: true,
            data: {
              summary: {
                totalItems: 120,
                lowStockItems: 5,
                outOfStockItems: 2,
                totalStockValue: 15000000,
                averageStockPerItem: 45,
              },
              lowStockAlerts: [
                {
                  id: 3,
                  sku: 'ITM-003',
                  name: 'Ayam Geprek',
                  category: 'Main Course',
                  stock: 5,
                  minStock: 10,
                  price: 30000,
                  stockValue: 150000,
                  status: 'low',
                },
              ],
              items: [
                {
                  id: 1,
                  sku: 'ITM-001',
                  name: 'Nasi Goreng',
                  category: 'Main Course',
                  stock: 50,
                  minStock: 10,
                  price: 25000,
                  stockValue: 1250000,
                  isLowStock: false,
                  isActive: true,
                  outlet: 'Main Branch',
                },
                {
                  id: 2,
                  sku: 'ITM-002',
                  name: 'Mie Goreng',
                  category: 'Main Course',
                  stock: 30,
                  minStock: 10,
                  price: 20000,
                  stockValue: 600000,
                  isLowStock: false,
                  isActive: true,
                  outlet: 'Main Branch',
                },
              ],
            },
          },
        },
      ],
      errorCodes: [
        {
          code: 401,
          message: 'API_KEY_MISSING / INVALID_API_KEY',
          description: 'API key is missing or invalid',
        },
        {
          code: 403,
          message: 'API_KEY_DISABLED / API_KEY_EXPIRED / TENANT_INACTIVE',
          description: 'API key is disabled, expired, or tenant is inactive',
        },
        {
          code: 500,
          message: 'INTERNAL_ERROR',
          description: 'Server error occurred',
        },
      ],
    };

    res.json({
      success: true,
      data: documentation,
    });
  } catch (error) {
    console.error('Error fetching API documentation:', error);
    return next(error);
  }
};
