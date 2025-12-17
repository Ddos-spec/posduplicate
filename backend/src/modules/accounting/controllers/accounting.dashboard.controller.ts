import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get Dashboard Stats
 * - Total Revenue
 * - Total Expenses
 * - Net Profit
 * - Cash Balance
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const tenantId = req.tenantId!;

    let start = new Date();
    let end = new Date();

    if (startDate && endDate) {
        start = new Date(String(startDate));
        end = new Date(String(endDate));
    } else {
        // Default based on period
        const now = new Date();
        if (period === 'daily') {
            start = new Date(now.setHours(0,0,0,0));
            end = new Date(now.setHours(23,59,59,999));
        } else if (period === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            start = new Date(now.setDate(diff));
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
        } else {
            // Monthly default
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23,59,59,999);
        }
    }

    // 1. Revenue & Expenses (from GL)
    const glAgg = await prisma.$queryRaw`
        SELECT 
            coa.account_type,
            SUM(gl.debit_amount) as total_debit,
            SUM(gl.credit_amount) as total_credit
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        AND gl.transaction_date >= ${start}
        AND gl.transaction_date <= ${end}
        AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
        GROUP BY coa.account_type
    `;

    let revenue = new Decimal(0);
    let expenses = new Decimal(0); // Includes COGS + Expenses

    if (Array.isArray(glAgg)) {
        for (const row of glAgg) {
            const debit = new Decimal(row.total_debit || 0);
            const credit = new Decimal(row.total_credit || 0);
            
            if (row.account_type === 'REVENUE') {
                revenue = revenue.plus(credit.minus(debit));
            } else {
                expenses = expenses.plus(debit.minus(credit));
            }
        }
    }

    const netProfit = revenue.minus(expenses);

    // 2. Cash Balance (Current, not just period)
    const cashAgg: any[] = await prisma.$queryRaw`
        SELECT 
            SUM(gl.debit_amount - gl.credit_amount) as balance
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        AND coa.account_type = 'CASH_BANK'
    `;
    const cashBalance = new Decimal(cashAgg[0]?.balance || 0);

    // 3. Receivables & Payables (Current)
    const arAgg: any[] = await prisma.$queryRaw`
        SELECT SUM(balance) as total FROM "accounting"."accounts_receivable" 
        WHERE tenant_id = ${tenantId} AND status != 'paid' AND status != 'bad_debt'
    `;
    const apAgg: any[] = await prisma.$queryRaw`
        SELECT SUM(balance) as total FROM "accounting"."accounts_payable" 
        WHERE tenant_id = ${tenantId} AND status != 'paid' AND status != 'cancelled'
    `;

    res.json({
        success: true,
        data: {
            revenue,
            expenses,
            netProfit,
            cashBalance,
            receivables: new Decimal(arAgg[0]?.total || 0),
            payables: new Decimal(apAgg[0]?.total || 0),
            period: { start, end }
        }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Charts Data (Trend)
 */
export const getChartData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { period = 'monthly' } = req.query; // daily, weekly, monthly
        const tenantId = req.tenantId!;
        
        // Define range based on period (e.g. last 30 days, last 12 weeks, last 12 months)
        if (period === 'monthly') {
             // Last 12 months
             // Group by Month
        }

        // Simplified: Last 30 days daily trend
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const dailyData: any[] = await prisma.$queryRaw`
            SELECT 
                DATE(gl.transaction_date) as date,
                coa.account_type,
                SUM(gl.credit_amount - gl.debit_amount) as net_amount
            FROM "accounting"."general_ledger" gl
            JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
            WHERE gl.tenant_id = ${tenantId}
            AND gl.transaction_date >= ${start}
            AND coa.account_type IN ('REVENUE', 'EXPENSE')
            GROUP BY DATE(gl.transaction_date), coa.account_type
            ORDER BY date
        `;

        // Process into chart format
        const dateMap = new Map();

        dailyData.forEach(row => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (!dateMap.has(dateStr)) dateMap.set(dateStr, { date: dateStr, revenue: 0, expense: 0 });
            
            const entry = dateMap.get(dateStr);
            const amount = new Decimal(row.net_amount);

            if (row.account_type === 'REVENUE') {
                entry.revenue = Number(amount);
            } else {
                // Expense is Debit normal, so net_amount (Credit-Debit) is negative. Negate it to be positive expense.
                entry.expense = Number(amount.negated());
            }
        });

        res.json({
            success: true,
            data: Array.from(dateMap.values())
        });

    } catch (error) {
        next(error);
    }
}

/**
 * Distributor Dashboard
 */
export const getDistributorDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.tenantId!;
        // Logic:
        // 1. Total Pembelian (Stock Movement In)
        // 2. Hutang Supplier (AP)
        // 3. PO status? (Mocked or from StockMovements pending?)
        
        // Mocking some parts as detailed PO logic isn't fully in stock_movements yet (just 'in' type)
        
        const purchaseStats: any[] = await prisma.$queryRaw`
            SELECT SUM(total_cost) as total FROM "stock_movements"
            WHERE outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
            AND type = 'IN'
        `;
        
        const apStats: any[] = await prisma.$queryRaw`
            SELECT SUM(balance) as total FROM "accounting"."accounts_payable"
            WHERE tenant_id = ${tenantId} AND status != 'paid'
        `;

        res.json({
            success: true,
            data: {
                stats: {
                    totalPembelian: {
                        value: Number(purchaseStats[0]?.total || 0),
                        trend: 0 // Mock
                    },
                    hutangSupplier: {
                        value: Number(apStats[0]?.total || 0),
                        dueSoon: 0 // Need DB query on due_date
                    }
                },
                recentPurchaseOrders: [], // Fetch from stock_movements limit 5
                topSuppliers: [] 
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Produsen Dashboard
 */
export const getProdusenDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        void req;
        // Logic:
        // 1. Production output (Stock Movement IN for Finished Goods?)
        // 2. Raw Material usage (Stock Movement OUT for Ingredients?)
        
        res.json({
            success: true,
            data: {
                stats: {
                    produksiHariIni: { value: 0, target: 100 },
                    bahanBakuTersedia: { percentage: 100 }
                },
                workOrders: []
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Retail Dashboard
 */
export const getRetailDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.tenantId!;
        
        // Sales Today
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const salesStats: any[] = await prisma.$queryRaw`
            SELECT SUM(total) as total, COUNT(*) as count 
            FROM "transactions"
            WHERE outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
            AND created_at >= ${today}
            AND status = 'completed'
        `;

        const arStats: any[] = await prisma.$queryRaw`
            SELECT SUM(balance) as total FROM "accounting"."accounts_receivable"
            WHERE tenant_id = ${tenantId} AND status != 'paid'
        `;

        res.json({
            success: true,
            data: {
                stats: {
                    penjualanHariIni: {
                        value: Number(salesStats[0]?.total || 0),
                        transactionCount: Number(salesStats[0]?.count || 0)
                    },
                    piutangCustomer: {
                        value: Number(arStats[0]?.total || 0)
                    }
                },
                recentOrders: [], // Fetch from transactions limit 5
                topProducts: []
            }
        });
    } catch (error) {
        next(error);
    }
};
