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
        const [purchaseStats, apStats, recentRows, supplierRows] = await Promise.all([
          prisma.$queryRaw<any[]>`
            SELECT SUM(total_cost) as total FROM "stock_movements"
            WHERE outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
            AND type = 'IN'
          `,
          prisma.$queryRaw<any[]>`
            SELECT SUM(balance) as total,
                   SUM(CASE WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN balance ELSE 0 END) AS due_soon
            FROM "accounting"."accounts_payable"
            WHERE tenant_id = ${tenantId} AND status != 'paid'
          `,
          prisma.$queryRaw<any[]>`
            SELECT po.id, po.po_number, po.status, po.order_date, po.total, s.name AS supplier_name
            FROM public.purchase_orders po
            JOIN public.outlets o ON o.id = po.outlet_id
            LEFT JOIN public.suppliers s ON s.id = po.supplier_id
            WHERE o.tenant_id = ${tenantId}
            ORDER BY po.order_date DESC
            LIMIT 5
          `,
          prisma.$queryRaw<any[]>`
            SELECT COALESCE(s.name, 'Tanpa supplier') AS supplier_name,
                   COUNT(*)::int AS order_count,
                   SUM(po.total) AS total
            FROM public.purchase_orders po
            JOIN public.outlets o ON o.id = po.outlet_id
            LEFT JOIN public.suppliers s ON s.id = po.supplier_id
            WHERE o.tenant_id = ${tenantId}
            GROUP BY COALESCE(s.name, 'Tanpa supplier')
            ORDER BY SUM(po.total) DESC
            LIMIT 5
          `,
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    totalPembelian: {
                        value: Number(purchaseStats[0]?.total || 0),
                        trend: null,
                        trendSource: 'unavailable'
                    },
                    hutangSupplier: {
                        value: Number(apStats[0]?.total || 0),
                        dueSoon: Number(apStats[0]?.due_soon || 0)
                    }
                },
                recentPurchaseOrders: recentRows.map((row) => ({
                    id: Number(row.id),
                    poNumber: row.po_number,
                    status: row.status,
                    orderDate: row.order_date,
                    total: Number(row.total || 0),
                    supplierName: row.supplier_name ?? null,
                })),
                topSuppliers: supplierRows.map((row) => ({
                    supplierName: row.supplier_name,
                    orderCount: Number(row.order_count || 0),
                    total: Number(row.total || 0),
                })),
                provenance: 'database'
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
        const tenantId = req.tenantId!;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [productionRows, workOrderRows] = await Promise.all([
          prisma.$queryRaw<any[]>`
            SELECT COALESCE(SUM(quantity_produced), 0) AS produced,
                   COUNT(*) FILTER (WHERE status IN ('confirmed','in_progress'))::int AS active_count
            FROM public.manufacturing_orders
            WHERE tenant_id = ${tenantId} AND created_at >= ${today}
          `,
          prisma.$queryRaw<any[]>`
            SELECT mo.id, mo.mo_number, mo.status, mo.quantity_planned, mo.quantity_produced,
                   mo.scheduled_at, i.name AS item_name
            FROM public.manufacturing_orders mo
            JOIN public.items i ON i.id = mo.item_id
            WHERE mo.tenant_id = ${tenantId}
            ORDER BY mo.created_at DESC
            LIMIT 5
          `,
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    produksiHariIni: {
                        value: Number(productionRows[0]?.produced || 0),
                        target: null,
                        targetSource: 'unavailable'
                    },
                    bahanBakuTersedia: {
                        percentage: null,
                        source: 'unavailable',
                        reason: 'Persentase lintas satuan tidak dapat dihitung secara valid'
                    },
                    workOrderAktif: Number(productionRows[0]?.active_count || 0)
                },
                workOrders: workOrderRows.map((row) => ({
                    id: Number(row.id),
                    moNumber: row.mo_number,
                    itemName: row.item_name,
                    status: row.status,
                    quantityPlanned: Number(row.quantity_planned),
                    quantityProduced: Number(row.quantity_produced),
                    scheduledAt: row.scheduled_at,
                })),
                provenance: 'database'
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

        const [recentRows, productRows] = await Promise.all([
          prisma.$queryRaw<any[]>`
            SELECT t.id, t.transaction_number, t.customer_name, t.total, t.status, t.created_at
            FROM public.transactions t
            JOIN public.outlets o ON o.id = t.outlet_id
            WHERE o.tenant_id = ${tenantId}
            ORDER BY t.created_at DESC
            LIMIT 5
          `,
          prisma.$queryRaw<any[]>`
            SELECT ti.item_id, ti.item_name, SUM(ti.quantity) AS quantity, SUM(ti.subtotal) AS revenue
            FROM public.transaction_items ti
            JOIN public.transactions t ON t.id = ti.transaction_id
            JOIN public.outlets o ON o.id = t.outlet_id
            WHERE o.tenant_id = ${tenantId} AND t.status = 'completed'
            GROUP BY ti.item_id, ti.item_name
            ORDER BY SUM(ti.subtotal) DESC
            LIMIT 5
          `,
        ]);

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
                recentOrders: recentRows.map((row) => ({
                    id: Number(row.id),
                    transactionNumber: row.transaction_number,
                    customerName: row.customer_name,
                    total: Number(row.total || 0),
                    status: row.status,
                    createdAt: row.created_at,
                })),
                topProducts: productRows.map((row) => ({
                    itemId: Number(row.item_id),
                    itemName: row.item_name,
                    quantity: Number(row.quantity || 0),
                    revenue: Number(row.revenue || 0),
                })),
                provenance: 'database'
            }
        });
    } catch (error) {
        next(error);
    }
};
