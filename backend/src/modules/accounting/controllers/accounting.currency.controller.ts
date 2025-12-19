import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * MULTI-CURRENCY SUPPORT
 * Exchange rates, currency conversion, and multi-currency reporting
 */

// Default supported currencies
const SUPPORTED_CURRENCIES = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 }
];

// In-memory exchange rate cache (would be DB-backed in production)
const exchangeRates: Map<string, { rate: number; date: string }> = new Map();

// Default rates (IDR base)
const defaultRates: Record<string, number> = {
  'IDR': 1,
  'USD': 15500,
  'EUR': 17000,
  'SGD': 11500,
  'MYR': 3500,
  'JPY': 105,
  'CNY': 2200,
  'AUD': 10500,
  'GBP': 19500
};

/**
 * Get supported currencies
 */
export const getCurrencies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        baseCurrency: 'IDR',
        currencies: SUPPORTED_CURRENCIES
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get exchange rates
 */
export const getExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { date, baseCurrency = 'IDR' } = req.query;

    const rateDate = date ? new Date(date as string) : new Date();

    // Get rates from DB or use defaults
    // In production, this would fetch from a rates table
    const rates: Record<string, { rate: number; inverse: number }> = {};

    SUPPORTED_CURRENCIES.forEach(currency => {
      const baseRate = defaultRates[baseCurrency as string] || 1;
      const targetRate = defaultRates[currency.code] || 1;

      if (baseCurrency === 'IDR') {
        rates[currency.code] = {
          rate: targetRate,
          inverse: 1 / targetRate
        };
      } else {
        rates[currency.code] = {
          rate: targetRate / baseRate,
          inverse: baseRate / targetRate
        };
      }
    });

    res.json({
      success: true,
      data: {
        baseCurrency,
        date: rateDate.toISOString().split('T')[0],
        rates
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update exchange rate
 */
export const updateExchangeRate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { currencyCode, rate, effectiveDate } = req.body;

    if (!currencyCode || !rate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Currency code and rate are required' }
      });
    }

    // Store rate (in production, save to DB)
    exchangeRates.set(currencyCode, {
      rate: parseFloat(rate),
      date: effectiveDate || new Date().toISOString().split('T')[0]
    });

    res.json({
      success: true,
      message: 'Exchange rate updated',
      data: {
        currencyCode,
        rate: parseFloat(rate),
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Convert amount between currencies
 */
export const convertCurrency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, fromCurrency, toCurrency, date } = req.query;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount, fromCurrency, and toCurrency are required' }
      });
    }

    const amountNum = parseFloat(amount as string);
    const fromRate = defaultRates[fromCurrency as string] || 1;
    const toRate = defaultRates[toCurrency as string] || 1;

    // Convert: amount in fromCurrency -> IDR -> toCurrency
    const amountInIDR = amountNum * fromRate;
    const convertedAmount = amountInIDR / toRate;

    const targetCurrency = SUPPORTED_CURRENCIES.find(c => c.code === toCurrency);
    const decimals = targetCurrency?.decimals || 2;

    res.json({
      success: true,
      data: {
        originalAmount: amountNum,
        fromCurrency,
        toCurrency,
        convertedAmount: Math.round(convertedAmount * Math.pow(10, decimals)) / Math.pow(10, decimals),
        exchangeRate: fromRate / toRate,
        date: date || new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get multi-currency balance report
 */
export const getMultiCurrencyBalances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { displayCurrency = 'IDR' } = req.query;

    // Get cash/bank accounts with their balances
    const cashAccounts: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.description,
        COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as balance
      FROM "accounting"."chart_of_accounts" coa
      LEFT JOIN "accounting"."general_ledger" gl ON coa.id = gl.account_id
      WHERE coa.tenant_id = ${tenantId}
      AND coa.account_type = 'CASH_BANK'
      AND coa.is_active = true
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.description
      ORDER BY coa.account_code
    `);

    // Parse currency from account name/description (e.g., "Bank USD", "Kas EUR")
    const balancesByCurrency: Record<string, { accounts: any[]; total: number }> = {};
    let totalInDisplayCurrency = 0;

    cashAccounts.forEach(account => {
      // Try to detect currency from account name
      let currency = 'IDR';
      const nameLower = (account.account_name + ' ' + (account.description || '')).toLowerCase();

      for (const curr of SUPPORTED_CURRENCIES) {
        if (nameLower.includes(curr.code.toLowerCase()) ||
            nameLower.includes(curr.name.toLowerCase())) {
          currency = curr.code;
          break;
        }
      }

      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = { accounts: [], total: 0 };
      }

      const balance = Number(account.balance || 0);
      balancesByCurrency[currency].accounts.push({
        ...account,
        balance,
        currency
      });
      balancesByCurrency[currency].total += balance;

      // Convert to display currency
      const fromRate = defaultRates[currency] || 1;
      const toRate = defaultRates[displayCurrency as string] || 1;
      totalInDisplayCurrency += (balance * fromRate) / toRate;
    });

    res.json({
      success: true,
      data: {
        displayCurrency,
        balancesByCurrency,
        totalInDisplayCurrency: Math.round(totalInDisplayCurrency),
        asOfDate: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate realized/unrealized forex gain/loss
 */
export const getForexGainLoss = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, baseCurrency = 'IDR' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start and end date required' }
      });
    }

    // This would track forex transactions and calculate gains/losses
    // For now, return structure
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        baseCurrency,
        realizedGainLoss: 0,
        unrealizedGainLoss: 0,
        details: [],
        note: 'Forex gain/loss calculation requires currency-tagged transactions'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get historical exchange rates
 */
export const getHistoricalRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currencyCode, startDate, endDate } = req.query;

    if (!currencyCode || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Currency code, start date, and end date required' }
      });
    }

    // Generate sample historical data
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const baseRate = defaultRates[currencyCode as string] || 1;
    const history = [];

    const current = new Date(start);
    while (current <= end) {
      // Add some variance for historical simulation
      const variance = (Math.random() - 0.5) * 0.02; // ±1%
      history.push({
        date: current.toISOString().split('T')[0],
        rate: Math.round(baseRate * (1 + variance))
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        currencyCode,
        baseCurrency: 'IDR',
        history
      }
    });
  } catch (error) {
    next(error);
  }
};
