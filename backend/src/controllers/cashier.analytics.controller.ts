import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
  userId?: number;
  tenantId?: number;
  userRole?: string;
}

// Get cashier performance data
export const getCashierPerformance = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { days = 30 } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
    }

    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Get transactions with cashier info
    const transactions = await prisma.Transaction.findMany({
      where: {
        tenantId: tenantId,
        createdAt: {
          gte: startDate
        },
        cashierId: {
          not: null
        }
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        cashierId: true,
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

    transactions.forEach(txn => {
      if (!txn.cashierId || !txn.users) return;

      const cashierId = txn.cashierId;
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
