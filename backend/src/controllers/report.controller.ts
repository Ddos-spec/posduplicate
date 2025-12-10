import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Helper to get outlet IDs for a tenant
async function getOutletIdsByTenant(tenantId: number): Promise<number[]> {
  const outlets = await prisma.outlet.findMany({
    where: { tenantId },
    select: { id: true }
  });
  return outlets.map((o: any) => o.id);
}

// 1. Financial Report (P&L and Payments)
export const getFinancialReport = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req; // Assuming auth middleware sets this
    const { outlet_id, start_date, end_date } = req.query;

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);
    endDate.setHours(23, 59, 59, 999);

    const whereTransaction: any = {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    };

    const whereExpense: any = {
      createdAt: { gte: startDate, lte: endDate }
    };

    if (outlet_id) {
      whereTransaction.outletId = parseInt(outlet_id as string);
      whereExpense.outletId = parseInt(outlet_id as string);
    } else if (tenantId) {
      const outletIds = await getOutletIdsByTenant(tenantId);
      whereTransaction.outletId = { in: outletIds };
      whereExpense.outletId = { in: outletIds };
    }

    // A. Gross & Net Sales
    const salesAgg = await prisma.transaction.aggregate({
      where: whereTransaction,
      _sum: {
        total: true, // Net Sales
        subtotal: true, // Gross Sales
        taxAmount: true,
        discountAmount: true
      }
    });

    // B. Calculate COGS (Approximation based on current item cost)
    // We need to fetch all sold items in this period
    const soldItems = await prisma.transactionItem.findMany({
      where: {
        transactions: whereTransaction
      },
      include: {
        items: true
      }
    });

    let totalCOGS = 0;
    soldItems.forEach(item => {
      // Use item cost if available, otherwise 0
      const unitCost = Number(item.items.cost || 0);
      const qty = Number(item.quantity);
      totalCOGS += unitCost * qty;
    });

    // C. Expenses
    const expenseAgg = await prisma.expense.aggregate({
      where: whereExpense,
      _sum: { amount: true }
    });

    const totalSales = Number(salesAgg._sum.total || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    // D. Payment Methods
    // Fetch directly from transactions payments
    const payments = await prisma.payments.groupBy({
        by: ['method'],
        where: {
            transactions: whereTransaction
        },
        _sum: {
            amount: true
        }
    });

    res.json({
      success: true,
      data: {
        summary: {
            totalSales,
            totalCOGS,
            grossProfit,
            totalExpenses,
            netProfit,
            margin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0
        },
        paymentMethods: payments.map(p => ({
            method: p.method,
            amount: Number(p._sum.amount || 0)
        }))
      }
    });
  } catch (error) {
    _next(error);
  }
};

// 2. Operational Report (Peak Hours & Days)
export const getOperationalReport = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const { tenantId } = req;
        const { outlet_id, start_date, end_date } = req.query;
    
        const startDate = new Date(start_date as string);
        const endDate = new Date(end_date as string);
        endDate.setHours(23, 59, 59, 999);
    
        const where: any = {
          status: 'completed',
          createdAt: { gte: startDate, lte: endDate }
        };

        if (outlet_id) {
            where.outletId = parseInt(outlet_id as string);
        } else if (tenantId) {
            const outletIds = await getOutletIdsByTenant(tenantId);
            where.outletId = { in: outletIds };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            select: { createdAt: true, total: true }
        });

        // Initialize counters
        const hoursDistribution = Array(24).fill(0);
        const daysDistribution = Array(7).fill(0);
        const daysLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        transactions.forEach(t => {
            if (!t.createdAt) return;
            // Convert to WIB (UTC+7) manually
            const date = new Date(t.createdAt.getTime() + (7 * 60 * 60 * 1000));
            
            const hour = date.getUTCHours();
            const day = date.getUTCDay();

            hoursDistribution[hour]++;
            daysDistribution[day]++;
        });

        res.json({
            success: true,
            data: {
                peakHours: hoursDistribution.map((count, hour) => ({
                    hour: `${hour.toString().padStart(2, '0')}:00`,
                    count
                })),
                busyDays: daysDistribution.map((count, index) => ({
                    day: daysLabel[index],
                    count
                }))
            }
        });

    } catch (error) {
        _next(error);
    }
};

// 3. Inventory Valuation
export const getInventoryValuation = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const { tenantId } = req;
        const { outlet_id } = req.query;

        const where: any = { isActive: true };
        if (outlet_id) {
            where.outletId = parseInt(outlet_id as string);
        } else if (tenantId) {
            const outletIds = await getOutletIdsByTenant(tenantId);
            where.outletId = { in: outletIds };
        }

        // Ingredients Valuation
        const ingredients = await prisma.ingredients.findMany({
            where,
            select: { name: true, stock: true, cost_per_unit: true, unit: true }
        });

        // Items Valuation (if they have stock tracking)
        const items = await prisma.items.findMany({
            where: { ...where, trackStock: true },
            select: { name: true, stock: true, cost: true }
        });

        let totalAssetValue = 0;
        const assetDetails: any[] = [];

        ingredients.forEach(ing => {
            const val = Number(ing.stock || 0) * Number(ing.cost_per_unit || 0);
            totalAssetValue += val;
            if (val > 0) {
                assetDetails.push({
                    name: ing.name,
                    type: 'Ingredient',
                    stock: ing.stock,
                    unit: ing.unit,
                    value: val
                });
            }
        });

        items.forEach(item => {
            const val = Number(item.stock || 0) * Number(item.cost || 0);
            totalAssetValue += val;
            if (val > 0) {
                assetDetails.push({
                    name: item.name,
                    type: 'Product',
                    stock: item.stock,
                    unit: 'pcs',
                    value: val
                });
            }
        });

        // Sort by value desc
        assetDetails.sort((a, b) => b.value - a.value);

        res.json({
            success: true,
            data: {
                totalAssetValue,
                details: assetDetails
            }
        });

    } catch (error) {
        _next(error);
    }
};

// 4. Customer Analytics
export const getCustomerAnalytics = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const { tenantId } = req;
        const { outlet_id } = req.query;

        const where: any = {};
        if (outlet_id) {
            where.outlet_id = parseInt(outlet_id as string);
        } else if (tenantId) {
            const outletIds = await getOutletIdsByTenant(tenantId);
            where.outlet_id = { in: outletIds };
        }

        const customers = await prisma.customers.findMany({
            where,
            orderBy: { total_spent: 'desc' },
            take: 20
        });

        const newCustomers = await prisma.customers.count({
            where: {
                ...where,
                created_at: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Last 30 days
                }
            }
        });

        const returningCustomers = await prisma.customers.count({
            where: {
                ...where,
                total_visits: { gt: 1 }
            }
        });

        res.json({
            success: true,
            data: {
                topSpenders: customers,
                metrics: {
                    newCustomers,
                    returningCustomers,
                    totalCustomers: await prisma.customers.count({ where })
                }
            }
        });

    } catch (error) {
        _next(error);
    }
};

// 5. Fraud & Audit
export const getFraudStats = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const { tenantId } = req;
        const { outlet_id, start_date, end_date } = req.query;

        const startDate = new Date(start_date as string);
        const endDate = new Date(end_date as string);
        endDate.setHours(23, 59, 59, 999);

        const where: any = {
            createdAt: { gte: startDate, lte: endDate }
        };
        
        if (outlet_id) {
            where.outletId = parseInt(outlet_id as string);
        } else if (tenantId) {
            const outletIds = await getOutletIdsByTenant(tenantId);
            where.outletId = { in: outletIds };
        }

        // Count Voids/Cancels
        const voidTransactions = await prisma.transaction.findMany({
            where: {
                ...where,
                status: { in: ['cancelled', 'void'] }
            },
            include: {
                users: { select: { name: true } } // Cashier
            }
        });

        // Group voids by cashier
        const voidsByCashier: {[key: string]: number} = {};
        voidTransactions.forEach(t => {
            const cashier = t.users?.name || 'Unknown';
            voidsByCashier[cashier] = (voidsByCashier[cashier] || 0) + 1;
        });

        // Get Activity Logs for sensitive actions
        const riskyActions = ['delete_transaction', 'force_discount', 'open_cash_drawer'];
        const logs = await prisma.activityLog.findMany({
            where: {
                created_at: { gte: startDate, lte: endDate },
                action_type: { in: riskyActions },
                ...(outlet_id ? { outlet_id: parseInt(outlet_id as string) } : {})
            },
            include: { users: { select: { name: true } } },
            orderBy: { created_at: 'desc' },
            take: 50
        });

        res.json({
            success: true,
            data: {
                totalVoids: voidTransactions.length,
                voidsByCashier: Object.entries(voidsByCashier).map(([name, count]) => ({ name, count })),
                recentRiskyActions: logs.map(l => ({
                    user: l.users?.name,
                    action: l.action_type,
                    time: l.created_at,
                    details: l.reason || '-'
                }))
            }
        });

    } catch (error) {
        _next(error);
    }
};
