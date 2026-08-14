import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const CRM_STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] as const;

type QuoteItemInput = {
  itemId?: number | null;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
  taxRate?: number;
};

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getTenantId = (req: Request) => {
  if (!req.tenantId) {
    const error: any = new Error('Tenant context is required');
    error.status = 400;
    error.code = 'TENANT_REQUIRED';
    throw error;
  }
  return req.tenantId;
};

const getTenantOutletIds = async (tenantId: number) => {
  const outlets = await prisma.outlets.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  return outlets.map((outlet) => outlet.id);
};

const assertOutletAccess = async (tenantId: number, outletId?: number | null) => {
  if (!outletId) return null;
  const outlet = await prisma.outlets.findFirst({
    where: { id: outletId, tenant_id: tenantId },
    select: { id: true, name: true }
  });
  if (!outlet) {
    const error: any = new Error('Outlet tidak ditemukan atau bukan milik tenant ini');
    error.status = 403;
    error.code = 'OUTLET_ACCESS_DENIED';
    throw error;
  }
  return outlet;
};

const assertCustomerAccess = async (tenantId: number, customerId?: number | null) => {
  if (!customerId) return null;
  const outletIds = await getTenantOutletIds(tenantId);
  if (outletIds.length === 0) {
    const error: any = new Error('Tenant belum memiliki outlet');
    error.status = 404;
    error.code = 'TENANT_OUTLET_NOT_FOUND';
    throw error;
  }

  const customer = await prisma.customers.findFirst({
    where: { id: customerId, outlet_id: { in: outletIds } }
  });
  if (!customer) {
    const error: any = new Error('Customer tidak ditemukan atau bukan milik tenant ini');
    error.status = 404;
    error.code = 'CUSTOMER_NOT_FOUND';
    throw error;
  }
  return customer;
};

const normalizeQuoteItems = async (tenantId: number, items: QuoteItemInput[]) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error: any = new Error('Quotation minimal memiliki satu item');
    error.status = 400;
    error.code = 'QUOTATION_ITEMS_REQUIRED';
    throw error;
  }

  const outletIds = await getTenantOutletIds(tenantId);
  const normalized = [] as Array<{
    itemId: number | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
  }>;

  for (const raw of items) {
    const quantity = numberValue(raw.quantity);
    if (quantity <= 0) {
      const error: any = new Error('Quantity quotation harus lebih dari 0');
      error.status = 400;
      error.code = 'INVALID_QUANTITY';
      throw error;
    }

    let description = String(raw.description || '').trim();
    let unitPrice = numberValue(raw.unitPrice);
    const itemId: number | null = raw.itemId ? Number(raw.itemId) : null;

    if (itemId) {
      const item = await prisma.items.findFirst({
        where: { id: itemId, outlet_id: { in: outletIds } },
        select: { id: true, name: true, price: true }
      });
      if (!item) {
        const error: any = new Error(`Item ${itemId} tidak ditemukan atau bukan milik tenant ini`);
        error.status = 404;
        error.code = 'ITEM_NOT_FOUND';
        throw error;
      }
      description = description || item.name;
      if (raw.unitPrice === undefined || raw.unitPrice === null) unitPrice = numberValue(item.price);
    }

    if (!description) {
      const error: any = new Error('Description wajib diisi untuk item custom');
      error.status = 400;
      error.code = 'ITEM_DESCRIPTION_REQUIRED';
      throw error;
    }
    if (unitPrice < 0) {
      const error: any = new Error('Harga item quotation tidak boleh negatif');
      error.status = 400;
      error.code = 'INVALID_UNIT_PRICE';
      throw error;
    }

    const discountAmount = Math.max(0, numberValue(raw.discountAmount));
    const taxRate = Math.max(0, numberValue(raw.taxRate));
    const gross = quantity * unitPrice;
    if (discountAmount > gross) {
      const error: any = new Error(`Diskon item ${description} melebihi nilai bruto`);
      error.status = 400;
      error.code = 'INVALID_DISCOUNT';
      throw error;
    }
    const lineSubtotal = gross - discountAmount;
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    normalized.push({ itemId, description, quantity, unitPrice, discountAmount, taxRate, lineSubtotal, lineTax, lineTotal });
  }

  return normalized;
};

export const getRevenueSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const [opportunities, quotations, orders] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(expected_revenue), 0) AS value
        FROM public.crm_opportunities
        WHERE tenant_id = ${tenantId}
        GROUP BY stage
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS value
        FROM public.sales_quotations
        WHERE tenant_id = ${tenantId}
        GROUP BY status
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS value
        FROM public.sales_orders
        WHERE tenant_id = ${tenantId}
        GROUP BY status
      `)
    ]);

    const pipelineValue = opportunities
      .filter((row) => !['won', 'lost'].includes(row.stage))
      .reduce((sum, row) => sum + numberValue(row.value), 0);
    const wonValue = opportunities
      .filter((row) => row.stage === 'won')
      .reduce((sum, row) => sum + numberValue(row.value), 0);

    res.json({ success: true, data: { opportunities, quotations, orders, pipelineValue, wonValue } });
  } catch (error) {
    next(error);
  }
};

export const getOpportunities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT o.*,
             c.name AS customer_name,
             c.phone AS customer_phone,
             u.name AS owner_name,
             (SELECT COUNT(*)::int FROM public.crm_activities a WHERE a.opportunity_id = o.id AND a.tenant_id = o.tenant_id AND a.status = 'open') AS open_activities
      FROM public.crm_opportunities o
      LEFT JOIN public.customers c ON c.id = o.customer_id
      LEFT JOIN public.users u ON u.id = o.owner_user_id
      WHERE o.tenant_id = ${tenantId}
      ORDER BY o.updated_at DESC, o.id DESC
    `);

    const stage = String(req.query.stage || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (stage && row.stage !== stage) return false;
      if (!search) return true;
      return [row.title, row.customer_name, row.customer_phone, row.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    res.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    next(error);
  }
};

export const createOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      title,
      customerId,
      outletId,
      stage = 'new',
      probability = 10,
      expectedRevenue = 0,
      source,
      ownerUserId,
      nextActivityAt,
      notes
    } = req.body;

    if (!String(title || '').trim()) return res.status(400).json({ success: false, error: { code: 'TITLE_REQUIRED', message: 'Judul opportunity wajib diisi' } });
    if (!CRM_STAGES.includes(stage)) return res.status(400).json({ success: false, error: { code: 'INVALID_STAGE', message: 'Stage CRM tidak valid' } });
    await assertOutletAccess(tenantId, outletId ? Number(outletId) : null);
    await assertCustomerAccess(tenantId, customerId ? Number(customerId) : null);

    const probabilityValue = Math.min(100, Math.max(0, numberValue(probability, 10)));
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.crm_opportunities
        (tenant_id, outlet_id, customer_id, title, stage, probability, expected_revenue, source, owner_user_id, next_activity_at, notes, created_by)
      VALUES
        (${tenantId}, ${outletId ? Number(outletId) : null}, ${customerId ? Number(customerId) : null}, ${String(title).trim()}, ${stage}, ${probabilityValue}, ${numberValue(expectedRevenue)}, ${source || null}, ${ownerUserId ? Number(ownerUserId) : null}, ${nextActivityAt ? new Date(nextActivityAt) : null}, ${notes || null}, ${req.userId || null})
      RETURNING *
    `);

    res.status(201).json({ success: true, data: rows[0], message: 'Opportunity created' });
  } catch (error) {
    next(error);
  }
};

export const moveOpportunityStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const id = Number(req.params.id);
    const { stage, probability, lostReason } = req.body;
    if (!CRM_STAGES.includes(stage)) return res.status(400).json({ success: false, error: { code: 'INVALID_STAGE', message: 'Stage CRM tidak valid' } });

    const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.crm_opportunities WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
    `);
    if (!existing[0]) return res.status(404).json({ success: false, error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' } });

    const nextProbability = probability === undefined
      ? stage === 'won' ? 100 : stage === 'lost' ? 0 : numberValue(existing[0].probability, 10)
      : Math.min(100, Math.max(0, numberValue(probability)));

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.crm_opportunities
      SET stage = ${stage},
          probability = ${nextProbability},
          lost_reason = ${stage === 'lost' ? (lostReason || 'Tidak ada alasan') : null},
          updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    res.json({ success: true, data: rows[0], message: 'Pipeline stage updated' });
  } catch (error) {
    next(error);
  }
};

export const createOpportunityActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const opportunityId = Number(req.params.id);
    const { activityType = 'follow_up', summary, dueAt, assignedUserId } = req.body;
    if (!String(summary || '').trim()) return res.status(400).json({ success: false, error: { code: 'SUMMARY_REQUIRED', message: 'Ringkasan aktivitas wajib diisi' } });

    const opportunity = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.crm_opportunities WHERE id = ${opportunityId} AND tenant_id = ${tenantId}
    `);
    if (!opportunity[0]) return res.status(404).json({ success: false, error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' } });

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.crm_activities
        (tenant_id, opportunity_id, activity_type, summary, due_at, assigned_user_id, created_by)
      VALUES
        (${tenantId}, ${opportunityId}, ${activityType}, ${String(summary).trim()}, ${dueAt ? new Date(dueAt) : null}, ${assignedUserId ? Number(assignedUserId) : null}, ${req.userId || null})
      RETURNING *
    `);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.crm_opportunities SET next_activity_at = COALESCE(${dueAt ? new Date(dueAt) : null}, next_activity_at), updated_at = NOW()
      WHERE id = ${opportunityId} AND tenant_id = ${tenantId}
    `);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT q.*, c.name AS customer_name, c.phone AS customer_phone,
             COALESCE((SELECT json_agg(json_build_object(
               'id', qi.id,
               'itemId', qi.item_id,
               'description', qi.description,
               'quantity', qi.quantity,
               'unitPrice', qi.unit_price,
               'discountAmount', qi.discount_amount,
               'taxRate', qi.tax_rate,
               'lineTotal', qi.line_total
             ) ORDER BY qi.id) FROM public.sales_quotation_items qi WHERE qi.quotation_id = q.id), '[]'::json) AS items
      FROM public.sales_quotations q
      LEFT JOIN public.customers c ON c.id = q.customer_id
      WHERE q.tenant_id = ${tenantId}
      ORDER BY q.created_at DESC
    `);

    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!search) return true;
      return [row.quotation_number, row.customer_name, row.customer_phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    res.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    next(error);
  }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { outletId, customerId, validUntil, currency = 'IDR', notes, opportunityId, items } = req.body;
    await assertOutletAccess(tenantId, outletId ? Number(outletId) : null);
    await assertCustomerAccess(tenantId, customerId ? Number(customerId) : null);
    const normalizedItems = await normalizeQuoteItems(tenantId, items);

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const discountAmount = normalizedItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxAmount = normalizedItems.reduce((sum, item) => sum + item.lineTax, 0);
    const total = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    const created = await prisma.$transaction(async (tx) => {
      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.sales_quotation_number_seq') AS seq`);
      const seq = Number(sequence[0].seq);
      const quotationNumber = `QT-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;

      const quoteRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.sales_quotations
          (tenant_id, outlet_id, customer_id, quotation_number, status, valid_until, currency, subtotal, discount_amount, tax_amount, total, notes, opportunity_id, created_by)
        VALUES
          (${tenantId}, ${outletId ? Number(outletId) : null}, ${customerId ? Number(customerId) : null}, ${quotationNumber}, 'draft', ${validUntil ? new Date(validUntil) : null}, ${String(currency).slice(0, 3).toUpperCase()}, ${subtotal}, ${discountAmount}, ${taxAmount}, ${total}, ${notes || null}, ${opportunityId ? Number(opportunityId) : null}, ${req.userId || null})
        RETURNING *
      `);
      const quote = quoteRows[0];

      for (const item of normalizedItems) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.sales_quotation_items
            (quotation_id, item_id, description, quantity, unit_price, discount_amount, tax_rate, line_total)
          VALUES
            (${quote.id}, ${item.itemId}, ${item.description}, ${item.quantity}, ${item.unitPrice}, ${item.discountAmount}, ${item.taxRate}, ${item.lineTotal})
        `);
      }

      if (opportunityId) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.crm_opportunities
          SET stage = CASE WHEN stage IN ('new','qualified') THEN 'proposal' ELSE stage END,
              probability = CASE WHEN probability < 50 THEN 50 ELSE probability END,
              updated_at = NOW()
          WHERE id = ${Number(opportunityId)} AND tenant_id = ${tenantId}
        `);
      }

      return quote;
    });

    res.status(201).json({ success: true, data: created, message: 'Quotation created' });
  } catch (error) {
    next(error);
  }
};

export const updateQuotationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const id = Number(req.params.id);
    const status = String(req.body.status || '');
    if (!QUOTATION_STATUSES.includes(status as any) || status === 'converted') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status quotation tidak valid untuk update manual' } });
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.sales_quotations
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status <> 'converted'
      RETURNING *
    `);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'QUOTATION_NOT_FOUND', message: 'Quotation tidak ditemukan atau sudah dikonversi' } });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const convertQuotationToOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const quotationId = Number(req.params.id);

    const order = await prisma.$transaction(async (tx) => {
      const quoteRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.sales_quotations
        WHERE id = ${quotationId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const quote = quoteRows[0];
      if (!quote) {
        const error: any = new Error('Quotation tidak ditemukan');
        error.status = 404;
        error.code = 'QUOTATION_NOT_FOUND';
        throw error;
      }
      if (quote.status === 'converted') {
        const existing = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.sales_orders WHERE quotation_id = ${quotationId} AND tenant_id = ${tenantId} LIMIT 1
        `);
        if (existing[0]) return existing[0];
      }
      if (['rejected', 'expired'].includes(quote.status)) {
        const error: any = new Error('Quotation rejected/expired tidak bisa dikonversi');
        error.status = 409;
        error.code = 'QUOTATION_NOT_CONVERTIBLE';
        throw error;
      }

      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.sales_order_number_seq') AS seq`);
      const seq = Number(sequence[0].seq);
      const salesOrderNumber = `SO-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;

      const orderRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.sales_orders
          (tenant_id, outlet_id, customer_id, quotation_id, sales_order_number, status, currency, subtotal, discount_amount, tax_amount, total, notes, created_by, confirmed_at)
        VALUES
          (${tenantId}, ${quote.outlet_id}, ${quote.customer_id}, ${quotationId}, ${salesOrderNumber}, 'confirmed', ${quote.currency}, ${quote.subtotal}, ${quote.discount_amount}, ${quote.tax_amount}, ${quote.total}, ${quote.notes}, ${req.userId || null}, NOW())
        RETURNING *
      `);
      const createdOrder = orderRows[0];

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.sales_order_items
          (sales_order_id, item_id, description, quantity, unit_price, discount_amount, tax_rate, line_total)
        SELECT ${createdOrder.id}, item_id, description, quantity, unit_price, discount_amount, tax_rate, line_total
        FROM public.sales_quotation_items
        WHERE quotation_id = ${quotationId}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.sales_quotations SET status = 'converted', updated_at = NOW()
        WHERE id = ${quotationId} AND tenant_id = ${tenantId}
      `);

      if (quote.opportunity_id) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.crm_opportunities
          SET stage = 'won', probability = 100, updated_at = NOW()
          WHERE id = ${quote.opportunity_id} AND tenant_id = ${tenantId}
        `);
      }

      return createdOrder;
    });

    res.status(201).json({ success: true, data: order, message: 'Quotation converted to sales order' });
  } catch (error) {
    next(error);
  }
};

export const getSalesOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT so.*, c.name AS customer_name, c.phone AS customer_phone,
             COALESCE((SELECT json_agg(json_build_object(
               'id', soi.id,
               'itemId', soi.item_id,
               'description', soi.description,
               'quantity', soi.quantity,
               'unitPrice', soi.unit_price,
               'lineTotal', soi.line_total
             ) ORDER BY soi.id) FROM public.sales_order_items soi WHERE soi.sales_order_id = so.id), '[]'::json) AS items
      FROM public.sales_orders so
      LEFT JOIN public.customers c ON c.id = so.customer_id
      WHERE so.tenant_id = ${tenantId}
      ORDER BY so.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getCustomer360 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const customerId = Number(req.params.customerId);
    const customer = await assertCustomerAccess(tenantId, customerId);
    if (!customer) return res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer tidak ditemukan' } });

    const outletIds = await getTenantOutletIds(tenantId);
    const [transactions, receivables, opportunities, orders, walletRows, ledger] = await Promise.all([
      prisma.transactions.findMany({
        where: {
          outlet_id: { in: outletIds },
          OR: [
            { customer_name: customer.name },
            ...(customer.phone ? [{ customer_phone: customer.phone }] : [])
          ]
        },
        select: { id: true, transaction_number: true, total: true, status: true, created_at: true, outlet_id: true },
        orderBy: { created_at: 'desc' },
        take: 100
      }),
      prisma.accounts_receivable.findMany({
        where: { tenant_id: tenantId, customer_id: customerId },
        select: { id: true, invoice_number: true, due_date: true, amount: true, received_amount: true, balance: true, status: true },
        orderBy: { due_date: 'desc' },
        take: 50
      }),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.crm_opportunities WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY updated_at DESC LIMIT 50
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.sales_orders WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT 50
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.loyalty_wallets WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} LIMIT 1
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.loyalty_ledger WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT 30
      `)
    ]);

    const completedTransactions = transactions.filter((trx) => trx.status === 'completed');
    const lifetimeValue = completedTransactions.reduce((sum, trx) => sum + numberValue(trx.total), 0);
    const outstandingReceivable = receivables.reduce((sum, ar) => sum + numberValue(ar.balance), 0);
    const wonPipelineValue = opportunities.filter((opp) => opp.stage === 'won').reduce((sum, opp) => sum + numberValue(opp.expected_revenue), 0);
    const openPipelineValue = opportunities.filter((opp) => !['won', 'lost'].includes(opp.stage)).reduce((sum, opp) => sum + numberValue(opp.expected_revenue), 0);

    res.json({
      success: true,
      data: {
        customer,
        metrics: {
          lifetimeValue,
          transactionCount: completedTransactions.length,
          averageOrderValue: completedTransactions.length ? lifetimeValue / completedTransactions.length : 0,
          outstandingReceivable,
          openPipelineValue,
          wonPipelineValue,
          lastTransactionAt: completedTransactions[0]?.created_at || null
        },
        recentTransactions: transactions.slice(0, 20),
        receivables,
        opportunities,
        salesOrders: orders,
        loyalty: { wallet: walletRows[0] || null, ledger }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLoyaltyWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const customerId = Number(req.params.customerId);
    await assertCustomerAccess(tenantId, customerId);

    const [walletRows, ledger] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.loyalty_wallets WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} LIMIT 1
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.loyalty_ledger WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT 100
      `)
    ]);

    res.json({ success: true, data: { wallet: walletRows[0] || null, ledger } });
  } catch (error) {
    next(error);
  }
};

export const adjustLoyaltyWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const customerId = Number(req.params.customerId);
    await assertCustomerAccess(tenantId, customerId);
    const { entryType = 'adjustment', pointsDelta = 0, monetaryDelta = 0, referenceType, referenceId, reason, allowNegative = false } = req.body;

    const allowedEntryTypes = ['earn', 'redeem', 'adjustment', 'expiry', 'refund'];
    if (!allowedEntryTypes.includes(entryType)) return res.status(400).json({ success: false, error: { code: 'INVALID_ENTRY_TYPE', message: 'Tipe loyalty ledger tidak valid' } });
    if (!String(reason || '').trim()) return res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'Alasan adjustment wajib diisi' } });
    const pointDeltaValue = Math.trunc(numberValue(pointsDelta));
    const monetaryDeltaValue = numberValue(monetaryDelta);
    if (pointDeltaValue === 0 && monetaryDeltaValue === 0) return res.status(400).json({ success: false, error: { code: 'EMPTY_ADJUSTMENT', message: 'Points atau wallet amount harus berubah' } });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.loyalty_wallets (tenant_id, customer_id)
        VALUES (${tenantId}, ${customerId})
        ON CONFLICT (tenant_id, customer_id) DO NOTHING
      `);

      const wallets = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.loyalty_wallets
        WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
        FOR UPDATE
      `);
      const wallet = wallets[0];
      const nextPoints = numberValue(wallet.points_balance) + pointDeltaValue;
      const nextMonetary = numberValue(wallet.monetary_balance) + monetaryDeltaValue;
      if (!allowNegative && (nextPoints < 0 || nextMonetary < 0)) {
        const error: any = new Error('Saldo loyalty tidak mencukupi');
        error.status = 409;
        error.code = 'INSUFFICIENT_LOYALTY_BALANCE';
        throw error;
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.loyalty_wallets
        SET points_balance = ${nextPoints},
            monetary_balance = ${nextMonetary},
            lifetime_points_earned = lifetime_points_earned + ${pointDeltaValue > 0 ? pointDeltaValue : 0},
            lifetime_points_redeemed = lifetime_points_redeemed + ${pointDeltaValue < 0 ? Math.abs(pointDeltaValue) : 0},
            updated_at = NOW()
        WHERE id = ${wallet.id}
      `);

      const entries = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.loyalty_ledger
          (tenant_id, customer_id, wallet_id, entry_type, points_delta, monetary_delta, reference_type, reference_id, reason, created_by)
        VALUES
          (${tenantId}, ${customerId}, ${wallet.id}, ${entryType}, ${pointDeltaValue}, ${monetaryDeltaValue}, ${referenceType || null}, ${referenceId ? String(referenceId) : null}, ${String(reason).trim()}, ${req.userId || null})
        RETURNING *
      `);

      const updated = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.loyalty_wallets WHERE id = ${wallet.id}`);
      return { wallet: updated[0], ledgerEntry: entries[0] };
    });

    res.status(201).json({ success: true, data: result, message: 'Loyalty ledger posted' });
  } catch (error) {
    next(error);
  }
};
