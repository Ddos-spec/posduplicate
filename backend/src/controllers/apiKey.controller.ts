import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { generateApiKey, hashApiKey } from '../utils/apiKeyGenerator';

/**
 * Get ALL API keys for ALL tenants (Admin only)
 */
export const getAllApiKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
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
      data: apiKeys,
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

    const apiKeys = await prisma.apiKey.findMany({
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

    const apiKeys = await prisma.apiKey.findMany({
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
    const hashedKey = hashApiKey(apiKey);

    // Create API key record
    const apiKeyRecord = await prisma.apiKey.create({
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

    const apiKey = await prisma.apiKey.update({
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

    await prisma.apiKey.delete({
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
      baseUrl: process.env.API_BASE_URL || 'https://your-api.com',
      version: '1.0.0',
      authentication: {
        type: 'API Key',
        headerName: 'X-API-Key',
        format: 'mypos_live_[64_hex_characters]',
      },
      endpoints: [
        {
          method: 'GET',
          path: '/api/owner/reports/sales',
          description: 'Get sales report with detailed transaction data',
          authentication: true,
          queryParameters: [
            {
              name: 'startDate',
              type: 'string',
              required: false,
              description: 'Start date in ISO format (e.g., 2025-11-01)',
            },
            {
              name: 'endDate',
              type: 'string',
              required: false,
              description: 'End date in ISO format (e.g., 2025-11-30)',
            },
            {
              name: 'outletId',
              type: 'number',
              required: false,
              description: 'Filter by specific outlet ID',
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
                totalItems: 320,
              },
              transactions: [
                {
                  transactionNumber: 'TRX-001',
                  orderType: 'dine-in',
                  subtotal: 100000,
                  total: 110000,
                  cashier: 'John Doe',
                  outlet: 'Main Branch',
                  createdAt: '2025-11-26T10:30:00Z',
                },
              ],
            },
          },
        },
        {
          method: 'GET',
          path: '/api/owner/reports/stock',
          description: 'Get inventory/stock report',
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
              description: 'Filter items with low stock (true/false)',
            },
          ],
          responseExample: {
            success: true,
            data: {
              summary: {
                totalItems: 120,
                lowStockItems: 5,
                totalStockValue: 15000000,
              },
              items: [
                {
                  id: 1,
                  sku: 'ITM-001',
                  name: 'Nasi Goreng',
                  category: 'Main Course',
                  stock: 50,
                  minStock: 10,
                  price: 25000,
                  isLowStock: false,
                },
              ],
            },
          },
        },
        {
          method: 'GET',
          path: '/api/owner/reports/transactions',
          description: 'Get transaction summary with payment methods and order types breakdown',
          authentication: true,
          queryParameters: [
            {
              name: 'startDate',
              type: 'string',
              required: false,
              description: 'Start date in ISO format',
            },
            {
              name: 'endDate',
              type: 'string',
              required: false,
              description: 'End date in ISO format',
            },
          ],
          responseExample: {
            success: true,
            data: {
              totalTransactions: 150,
              totalRevenue: 45000000,
              averageOrderValue: 300000,
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
            },
          },
        },
        {
          method: 'GET',
          path: '/api/owner/reports/cash-flow',
          description: 'Get cash flow report showing revenue and expenses',
          authentication: true,
          queryParameters: [
            {
              name: 'startDate',
              type: 'string',
              required: false,
              description: 'Start date in ISO format',
            },
            {
              name: 'endDate',
              type: 'string',
              required: false,
              description: 'End date in ISO format',
            },
          ],
          responseExample: {
            success: true,
            data: {
              revenue: 45000000,
              expenses: 0,
              netCashFlow: 45000000,
              transactionCount: 150,
            },
          },
        },
        {
          method: 'GET',
          path: '/api/owner/reports/top-items',
          description: 'Get top selling items ranked by quantity sold',
          authentication: true,
          queryParameters: [
            {
              name: 'startDate',
              type: 'string',
              required: false,
              description: 'Start date in ISO format',
            },
            {
              name: 'endDate',
              type: 'string',
              required: false,
              description: 'End date in ISO format',
            },
            {
              name: 'limit',
              type: 'number',
              required: false,
              description: 'Number of items to return (default: 10)',
            },
          ],
          responseExample: {
            success: true,
            data: [
              {
                itemId: 5,
                itemName: 'Nasi Goreng Special',
                totalQuantity: 120,
                totalRevenue: 3000000,
                transactionCount: 85,
              },
            ],
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
