import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

interface AuthRequest extends Request {
  userId?: number;
  tenantId?: number;
  userRole?: string;
}

// Get cashier performance data
export const getCashierPerformance = async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { days = 30 } = req.query;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
      return;
    }

    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Get transactions with cashier info
    const transactions = await prisma.transactions.findMany({
      where: {
        outlets: {
          tenant_id: tenantId
        },
        created_at: {
          gte: startDate
        },
        cashier_id: {
          not: null
        }
      },
      select: {
        id: true,
        total: true,
        created_at: true,
        cashier_id: true,
        users: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Group by cashier
    const cashierMap = new Map();

    transactions.forEach((txn: any) => {
      if (!txn.cashier_id || !txn.users) return;

      const cashierId = txn.cashier_id;
      const cashierName = txn.users.name;

      if (!cashierMap.has(cashierId)) {
        cashierMap.set(cashierId, {
          cashierId,
          cashierName,
          totalTransactions: 0,
          totalSales: 0,
          avgTransactionValue: 0
        });
      }

      const cashierData = cashierMap.get(cashierId);
      cashierData.totalTransactions++;
      cashierData.totalSales += parseFloat((txn.total ?? 0).toString());
    });

    // Calculate averages and convert to array
    const cashierPerformance = Array.from(cashierMap.values()).map(cashier => ({
      ...cashier,
      avgTransactionValue: cashier.totalTransactions > 0
        ? cashier.totalSales / cashier.totalTransactions
        : 0
    }));

    // Sort by total sales
    cashierPerformance.sort((a, b) => b.totalSales - a.totalSales);

    res.json({
      success: true,
      data: cashierPerformance
    });
  } catch (error) {
    _next(error);
  }
};
