import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * AGING REPORTS
 * A/R and A/P Aging Analysis
 */

interface AgingBucket {
  range: string;
  count: number;
  amount: number;
  percentage: number;
}

interface AgingReport {
  asOfDate: string;
  totalOutstanding: number;
  totalCount: number;
  buckets: AgingBucket[];
  details: any[];
  summary: {
    current: number;
    overdue: number;
    overduePercentage: number;
  };
}

/**
 * Get Accounts Receivable Aging Report
 */
export const getARAgingReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { asOfDate, outletId, customerId } = req.query;

    const refDate = asOfDate ? new Date(asOfDate as string) : new Date();

    let whereClause = `WHERE ar.tenant_id = ${tenantId} AND ar.status NOT IN ('paid', 'bad_debt')`;
    if (outletId) whereClause += ` AND ar.outlet_id = ${outletId}`;
    if (customerId) whereClause += ` AND ar.customer_id = ${customerId}`;

    // Get all outstanding AR with aging calculation
    const arData: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ar.id,
        ar.customer_id,
        ar.customer_name,
        ar.invoice_number,
        ar.invoice_date,
        ar.due_date,
        ar.amount,
        ar.received_amount,
        ar.balance,
        ar.status,
        c.name as customer_company,
        c.phone as customer_phone,
        EXTRACT(DAY FROM '${refDate.toISOString()}'::timestamp - ar.due_date::timestamp) as days_overdue
      FROM "accounting"."accounts_receivable" ar
      LEFT JOIN "customers" c ON ar.customer_id = c.id
      ${whereClause}
      ORDER BY ar.due_date ASC
    `);

    // Define aging buckets
    const buckets: AgingBucket[] = [
      { range: 'Current (Not Due)', count: 0, amount: 0, percentage: 0 },
      { range: '1-30 Days', count: 0, amount: 0, percentage: 0 },
      { range: '31-60 Days', count: 0, amount: 0, percentage: 0 },
      { range: '61-90 Days', count: 0, amount: 0, percentage: 0 },
      { range: '91-120 Days', count: 0, amount: 0, percentage: 0 },
      { range: 'Over 120 Days', count: 0, amount: 0, percentage: 0 }
    ];

    let totalOutstanding = 0;
    let currentTotal = 0;
    let overdueTotal = 0;

    const details = arData.map(ar => {
      const daysOverdue = Number(ar.days_overdue || 0);
      const balance = Number(ar.balance || 0);
      totalOutstanding += balance;

      let bucketIndex = 0;
      if (daysOverdue <= 0) {
        bucketIndex = 0;
        currentTotal += balance;
      } else if (daysOverdue <= 30) {
        bucketIndex = 1;
        overdueTotal += balance;
      } else if (daysOverdue <= 60) {
        bucketIndex = 2;
        overdueTotal += balance;
      } else if (daysOverdue <= 90) {
        bucketIndex = 3;
        overdueTotal += balance;
      } else if (daysOverdue <= 120) {
        bucketIndex = 4;
        overdueTotal += balance;
      } else {
        bucketIndex = 5;
        overdueTotal += balance;
      }

      buckets[bucketIndex].count++;
      buckets[bucketIndex].amount += balance;

      return {
        ...ar,
        daysOverdue: Math.max(0, daysOverdue),
        agingBucket: buckets[bucketIndex].range,
        balance
      };
    });

    // Calculate percentages
    buckets.forEach(bucket => {
      bucket.percentage = totalOutstanding > 0 ? Math.round((bucket.amount / totalOutstanding) * 10000) / 100 : 0;
    });

    const report: AgingReport = {
      asOfDate: refDate.toISOString().split('T')[0],
      totalOutstanding,
      totalCount: arData.length,
      buckets,
      details,
      summary: {
        current: currentTotal,
        overdue: overdueTotal,
        overduePercentage: totalOutstanding > 0 ? Math.round((overdueTotal / totalOutstanding) * 10000) / 100 : 0
      }
    };

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Accounts Payable Aging Report
 */
export const getAPAgingReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { asOfDate, outletId, supplierId } = req.query;

    const refDate = asOfDate ? new Date(asOfDate as string) : new Date();

    let whereClause = `WHERE ap.tenant_id = ${tenantId} AND ap.status NOT IN ('paid', 'cancelled')`;
    if (outletId) whereClause += ` AND ap.outlet_id = ${outletId}`;
    if (supplierId) whereClause += ` AND ap.supplier_id = ${supplierId}`;

    const apData: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ap.id,
        ap.supplier_id,
        ap.invoice_number,
        ap.invoice_date,
        ap.due_date,
        ap.amount,
        ap.paid_amount,
        ap.balance,
        ap.status,
        s.name as supplier_name,
        s.phone as supplier_phone,
        EXTRACT(DAY FROM '${refDate.toISOString()}'::timestamp - ap.due_date::timestamp) as days_overdue
      FROM "accounting"."accounts_payable" ap
      LEFT JOIN "suppliers" s ON ap.supplier_id = s.id
      ${whereClause}
      ORDER BY ap.due_date ASC
    `);

    const buckets: AgingBucket[] = [
      { range: 'Current (Not Due)', count: 0, amount: 0, percentage: 0 },
      { range: '1-30 Days', count: 0, amount: 0, percentage: 0 },
      { range: '31-60 Days', count: 0, amount: 0, percentage: 0 },
      { range: '61-90 Days', count: 0, amount: 0, percentage: 0 },
      { range: '91-120 Days', count: 0, amount: 0, percentage: 0 },
      { range: 'Over 120 Days', count: 0, amount: 0, percentage: 0 }
    ];

    let totalOutstanding = 0;
    let currentTotal = 0;
    let overdueTotal = 0;

    const details = apData.map(ap => {
      const daysOverdue = Number(ap.days_overdue || 0);
      const balance = Number(ap.balance || 0);
      totalOutstanding += balance;

      let bucketIndex = 0;
      if (daysOverdue <= 0) {
        bucketIndex = 0;
        currentTotal += balance;
      } else if (daysOverdue <= 30) {
        bucketIndex = 1;
        overdueTotal += balance;
      } else if (daysOverdue <= 60) {
        bucketIndex = 2;
        overdueTotal += balance;
      } else if (daysOverdue <= 90) {
        bucketIndex = 3;
        overdueTotal += balance;
      } else if (daysOverdue <= 120) {
        bucketIndex = 4;
        overdueTotal += balance;
      } else {
        bucketIndex = 5;
        overdueTotal += balance;
      }

      buckets[bucketIndex].count++;
      buckets[bucketIndex].amount += balance;

      return {
        ...ap,
        daysOverdue: Math.max(0, daysOverdue),
        agingBucket: buckets[bucketIndex].range,
        balance
      };
    });

    buckets.forEach(bucket => {
      bucket.percentage = totalOutstanding > 0 ? Math.round((bucket.amount / totalOutstanding) * 10000) / 100 : 0;
    });

    const report: AgingReport = {
      asOfDate: refDate.toISOString().split('T')[0],
      totalOutstanding,
      totalCount: apData.length,
      buckets,
      details,
      summary: {
        current: currentTotal,
        overdue: overdueTotal,
        overduePercentage: totalOutstanding > 0 ? Math.round((overdueTotal / totalOutstanding) * 10000) / 100 : 0
      }
    };

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Aging Summary (Combined A/R and A/P)
 */
export const getAgingSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { asOfDate } = req.query;
    const refDate = asOfDate ? new Date(asOfDate as string) : new Date();

    // A/R Summary
    const arSummary: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(CASE WHEN due_date >= '${refDate.toISOString()}' THEN balance ELSE 0 END), 0) as current_balance,
        COALESCE(SUM(CASE WHEN due_date < '${refDate.toISOString()}' THEN balance ELSE 0 END), 0) as overdue_balance,
        COALESCE(AVG(EXTRACT(DAY FROM '${refDate.toISOString()}'::timestamp - due_date::timestamp)), 0) as avg_days_outstanding
      FROM "accounting"."accounts_receivable"
      WHERE tenant_id = ${tenantId} AND status NOT IN ('paid', 'bad_debt')
    `);

    // A/P Summary
    const apSummary: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(CASE WHEN due_date >= '${refDate.toISOString()}' THEN balance ELSE 0 END), 0) as current_balance,
        COALESCE(SUM(CASE WHEN due_date < '${refDate.toISOString()}' THEN balance ELSE 0 END), 0) as overdue_balance,
        COALESCE(AVG(EXTRACT(DAY FROM '${refDate.toISOString()}'::timestamp - due_date::timestamp)), 0) as avg_days_outstanding
      FROM "accounting"."accounts_payable"
      WHERE tenant_id = ${tenantId} AND status NOT IN ('paid', 'cancelled')
    `);

    // Collection Effectiveness Index (CEI)
    // CEI = (Beginning Receivables + Credit Sales - Ending Receivables) / (Beginning Receivables + Credit Sales - Current Receivables) * 100
    const arTotal = Number(arSummary[0]?.total_balance || 0);
    const arCurrent = Number(arSummary[0]?.current_balance || 0);
    const cei = arTotal > 0 ? Math.round(((arTotal - arCurrent) / arTotal) * 100) : 100;

    res.json({
      success: true,
      data: {
        asOfDate: refDate.toISOString().split('T')[0],
        accountsReceivable: {
          totalCount: Number(arSummary[0]?.total_count || 0),
          totalBalance: Number(arSummary[0]?.total_balance || 0),
          currentBalance: Number(arSummary[0]?.current_balance || 0),
          overdueBalance: Number(arSummary[0]?.overdue_balance || 0),
          avgDaysOutstanding: Math.round(Number(arSummary[0]?.avg_days_outstanding || 0)),
          collectionEffectivenessIndex: cei
        },
        accountsPayable: {
          totalCount: Number(apSummary[0]?.total_count || 0),
          totalBalance: Number(apSummary[0]?.total_balance || 0),
          currentBalance: Number(apSummary[0]?.current_balance || 0),
          overdueBalance: Number(apSummary[0]?.overdue_balance || 0),
          avgDaysOutstanding: Math.round(Number(apSummary[0]?.avg_days_outstanding || 0))
        },
        netPosition: Number(arSummary[0]?.total_balance || 0) - Number(apSummary[0]?.total_balance || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Customer/Supplier Payment History
 */
export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { type, entityId, months = 12 } = req.query;

    if (!type || !entityId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Type (ar/ap) and entity ID required' }
      });
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    let history;
    if (type === 'ar') {
      history = await prisma.ar_collections.findMany({
        where: {
          tenant_id: tenantId,
          accounts_receivable: { customer_id: parseInt(entityId as string) },
          collection_date: { gte: startDate }
        },
        include: {
          accounts_receivable: { select: { invoice_number: true, customer_name: true } }
        },
        orderBy: { collection_date: 'desc' }
      });
    } else {
      history = await prisma.ap_payments.findMany({
        where: {
          tenant_id: tenantId,
          accounts_payable: { supplier_id: parseInt(entityId as string) },
          payment_date: { gte: startDate }
        },
        include: {
          accounts_payable: { select: { invoice_number: true } }
        },
        orderBy: { payment_date: 'desc' }
      });
    }

    // Calculate average payment time
    const paymentTimes = history.map((h: any) => {
      const invoice = type === 'ar' ? h.accounts_receivable : h.accounts_payable;
      // Would need invoice date to calculate actual payment time
      return h;
    });

    res.json({
      success: true,
      data: {
        history,
        totalPayments: history.length,
        totalAmount: history.reduce((sum: number, h: any) =>
          sum + Number(type === 'ar' ? h.collection_amount : h.payment_amount || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};
