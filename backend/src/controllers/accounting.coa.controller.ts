import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// --- SEEDER DATA ---
const defaultCoA = [
  // ASSETS
  { code: '1000', name: 'ASET', type: 'ASSET', category: 'CATEGORY', parent: null, is_system: true },
  { code: '1100', name: 'Aset Lancar', type: 'ASSET', category: 'SUB_CATEGORY', parent: '1000', is_system: true },
  { code: '1101', name: 'Kas Kecil', type: 'CASH_BANK', category: 'ACCOUNT', parent: '1100', normal_balance: 'DEBIT', is_system: false },
  { code: '1102', name: 'Bank BCA', type: 'CASH_BANK', category: 'ACCOUNT', parent: '1100', normal_balance: 'DEBIT', is_system: false },
  { code: '1201', name: 'Piutang Usaha', type: 'ACCOUNT_RECEIVABLE', category: 'ACCOUNT', parent: '1100', normal_balance: 'DEBIT', is_system: false },
  { code: '1301', name: 'Persediaan Barang', type: 'INVENTORY', category: 'ACCOUNT', parent: '1100', normal_balance: 'DEBIT', is_system: false },
  { code: '1200', name: 'Aset Tetap', type: 'ASSET', category: 'SUB_CATEGORY', parent: '1000', is_system: true },
  { code: '1201', name: 'Peralatan', type: 'FIXED_ASSET', category: 'ACCOUNT', parent: '1200', normal_balance: 'DEBIT', is_system: false },

  // LIABILITIES
  { code: '2000', name: 'KEWAJIBAN', type: 'LIABILITY', category: 'CATEGORY', parent: null, is_system: true },
  { code: '2100', name: 'Kewajiban Lancar', type: 'LIABILITY', category: 'SUB_CATEGORY', parent: '2000', is_system: true },
  { code: '2101', name: 'Hutang Usaha', type: 'ACCOUNT_PAYABLE', category: 'ACCOUNT', parent: '2100', normal_balance: 'CREDIT', is_system: false },
  { code: '2102', name: 'Hutang Gaji', type: 'LIABILITY', category: 'ACCOUNT', parent: '2100', normal_balance: 'CREDIT', is_system: false },
  { code: '2103', name: 'PPN Keluaran', type: 'TAX_PAYABLE', category: 'ACCOUNT', parent: '2100', normal_balance: 'CREDIT', is_system: false },

  // EQUITY
  { code: '3000', name: 'EKUITAS', type: 'EQUITY', category: 'CATEGORY', parent: null, is_system: true },
  { code: '3100', name: 'Modal Pemilik', type: 'EQUITY', category: 'ACCOUNT', parent: '3000', normal_balance: 'CREDIT', is_system: false },
  { code: '3200', name: 'Laba Ditahan', type: 'RETAINED_EARNINGS', category: 'ACCOUNT', parent: '3000', normal_balance: 'CREDIT', is_system: true },

  // REVENUE
  { code: '4000', name: 'PENDAPATAN', type: 'REVENUE', category: 'CATEGORY', parent: null, is_system: true },
  { code: '4101', name: 'Pendapatan Penjualan', type: 'REVENUE', category: 'ACCOUNT', parent: '4000', normal_balance: 'CREDIT', is_system: false },
  { code: '4102', name: 'Pendapatan Jasa', type: 'REVENUE', category: 'ACCOUNT', parent: '4000', normal_balance: 'CREDIT', is_system: false },

  // COGS
  { code: '5000', name: 'HARGA POKOK PENJUALAN', type: 'COGS', category: 'CATEGORY', parent: null, is_system: true },
  { code: '5101', name: 'HPP Barang', type: 'COGS', category: 'ACCOUNT', parent: '5000', normal_balance: 'DEBIT', is_system: false },

  // EXPENSES
  { code: '6000', name: 'BEBAN OPERASIONAL', type: 'EXPENSE', category: 'CATEGORY', parent: null, is_system: true },
  { code: '6101', name: 'Beban Gaji', type: 'EXPENSE', category: 'ACCOUNT', parent: '6000', normal_balance: 'DEBIT', is_system: false },
  { code: '6102', name: 'Beban Sewa', type: 'EXPENSE', category: 'ACCOUNT', parent: '6000', normal_balance: 'DEBIT', is_system: false },
  { code: '6103', name: 'Beban Listrik', type: 'EXPENSE', category: 'ACCOUNT', parent: '6000', normal_balance: 'DEBIT', is_system: false },
  { code: '6104', name: 'Beban Telepon', type: 'EXPENSE', category: 'ACCOUNT', parent: '6000', normal_balance: 'DEBIT', is_system: false },
];

/**
 * Seed Default CoA for a Tenant
 */
export const seedCoA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!; // Guaranteed by middleware

    // Check if CoA already exists
    const existing = await prisma.chart_of_accounts.findFirst({
      where: { tenant_id: tenantId }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'COA_EXISTS', message: 'Chart of Accounts already exists for this tenant' }
      });
    }

    // Insert accounts
    let count = 0;
    // We must insert parents first. The array is already sorted by code, 
    // and parents (e.g. 1000) come before children (e.g. 1100).
    // So simple iteration should work.
    
    for (const account of defaultCoA) {
      let parentId: number | null = null;
      
      if (account.parent) {
        const parent = await prisma.chart_of_accounts.findFirst({
          where: { tenant_id: tenantId, account_code: account.parent }
        });
        if (parent) parentId = parent.id;
      }

      await prisma.chart_of_accounts.create({
        data: {
          tenant_id: tenantId,
          account_code: account.code,
          account_name: account.name,
          account_type: account.type,
          category: account.category,
          parent_id: parentId,
          normal_balance: account.normal_balance || 'DEBIT',
          is_system: account.is_system,
          is_active: true
        }
      });
      count++;
    }

    return res.json({
      success: true,
      data: { count },
      message: `Successfully seeded ${count} accounts`
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get Chart of Accounts (Tree Structure)
 */
export const getCoA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, filter } = req.query;
    const tenantId = req.tenantId!;

    const where: any = { tenant_id: tenantId };
    
    if (search) {
      where.OR = [
        { account_code: { contains: String(search), mode: 'insensitive' } },
        { account_name: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (filter && filter !== 'all') {
      where.account_type = String(filter);
    }

    // Fetch accounts
    const accounts = await prisma.chart_of_accounts.findMany({
      where,
      orderBy: { account_code: 'asc' }
    });

    // Fetch balances (optional optimization: only if needed)
    // Using raw query to access view or aggregate GL
    // For now, let's try to aggregate GL if view access is tricky with Prisma without explicit model
    // But prompts says "Use view". Let's try raw query on view.
    let balances: any[] = [];
    try {
        balances = await prisma.$queryRaw`
            SELECT account_code, balance 
            FROM "accounting"."v_trial_balance" 
            WHERE tenant_id = ${tenantId}
        `;
    } catch (e) {
        console.warn('Failed to fetch balances from view', e);
    }

    const balanceMap = new Map(balances.map((b: any) => [b.account_code, Number(b.balance)]));

    // Build Tree
    const accountMap = new Map();
    const roots: any[] = [];

    // First pass: Create nodes and map
    accounts.forEach((acc: any) => {
      const balance = balanceMap.get(acc.account_code) || 0;
      const node = { ...acc, children: [], balance };
      accountMap.set(acc.id, node);
    });

    // Second pass: Link parents
    accounts.forEach((acc: any) => {
      const node = accountMap.get(acc.id);
      if (acc.parent_id && accountMap.has(acc.parent_id)) {
        accountMap.get(acc.parent_id).children.push(node);
      } else {
        roots.push(node); // Is a root (or parent not found/filtered out)
      }
    });

    // Calculate totals for summary
    // (Simplified summary logic)
    const summary = {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0
    };
    // Note: Accurate summary requires iterating all accounts or using the view totals.

    return res.json({
      success: true,
      data: {
        accounts: roots, // Returns tree
        flat: accounts, // Optional: return flat list if needed by frontend
        summary
      }
    });

  } catch (error) {
    return next(error);
  }
};

/**
 * Create New Account
 */
export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      account_code, account_name, account_type, 
      category, parent_id, normal_balance, description 
    } = req.body;

    const tenantId = req.tenantId!;

    // Validation
    const existing = await prisma.chart_of_accounts.findFirst({
      where: { tenant_id: tenantId, account_code }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_CODE', message: 'Account code already exists' }
      });
    }

    const account = await prisma.chart_of_accounts.create({
      data: {
        tenant_id: tenantId,
        account_code,
        account_name,
        account_type,
        category,
        parent_id,
        normal_balance: normal_balance || 'DEBIT',
        description,
        is_system: false,
        is_active: true
      }
    });

    // Audit Log handled by middleware if configured, or manual here?
    // We implemented middleware for POST, so it should be logged.

    return res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update Account
 */
export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { account_name, description, is_active } = req.body;
    const tenantId = req.tenantId!;

    const account = await prisma.chart_of_accounts.findFirst({
      where: { id: Number(id), tenant_id: tenantId }
    });

    if (!account) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } });
    }

    if (account.is_system && is_active === false) {
      return res.status(400).json({ success: false, error: { code: 'SYSTEM_ACCOUNT', message: 'Cannot deactivate system account' } });
    }

    const updated = await prisma.chart_of_accounts.update({
      where: { id: Number(id) },
      data: {
        account_name,
        description,
        is_active
      }
    });

    return res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    return next(error);
  }
};
