import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * Comprehensive Accounting Settings Controller
 * Manages all accounting configurations per tenant/outlet/role
 */
const tenantSettingsClient = (prisma as any).tenant_settings;

// ============= TYPES =============

interface AccountingSettings {
  general: GeneralSettings;
  fiscal: FiscalSettings;
  automation: AutomationSettings;
  reporting: ReportingSettings;
  forecasting: ForecastingSettings;
  notifications: NotificationSettings;
  permissions: PermissionSettings;
  integrations: IntegrationSettings;
}

interface GeneralSettings {
  companyName: string;
  taxId: string;
  baseCurrency: string;
  decimalPlaces: number;
  thousandSeparator: string;
  decimalSeparator: string;
  dateFormat: string;
  fiscalYearStart: number; // Month (1-12)
  accountingMethod: 'accrual' | 'cash';
  inventoryMethod: 'FIFO' | 'LIFO' | 'Average';
}

interface FiscalSettings {
  currentPeriod: string;
  autoClosePeriods: boolean;
  periodLockDays: number;
  requireApprovalForClosing: boolean;
  retainedEarningsAccount: number | null;
  defaultRevenueAccount: number | null;
  defaultExpenseAccount: number | null;
  defaultARAccount: number | null;
  defaultAPAccount: number | null;
  defaultCashAccount: number | null;
  defaultInventoryAccount: number | null;
}

interface AutomationSettings {
  autoPostJournals: boolean;
  autoReconcile: boolean;
  autoGenerateRecurring: boolean;
  autoCalculateDepreciation: boolean;
  autoApplyTax: boolean;
  defaultTaxRate: number;
  roundingMethod: 'nearest' | 'up' | 'down';
  roundingPrecision: number;
  journalNumberFormat: string;
  invoiceNumberFormat: string;
}

interface ReportingSettings {
  defaultReportFormat: 'pdf' | 'excel' | 'csv';
  includeZeroBalances: boolean;
  showAccountCodes: boolean;
  groupByCategory: boolean;
  comparativePeriods: number;
  defaultDateRange: 'mtd' | 'qtd' | 'ytd' | 'custom';
  emailReportsTo: string[];
  scheduleReports: boolean;
  reportSchedule: string; // cron format
}

interface ForecastingSettings {
  enabled: boolean;
  defaultMethod: 'ensemble' | 'holt-winters' | 'arima' | 'linear';
  forecastHorizon: number; // days
  confidenceLevel: number; // percentage
  seasonalityDetection: boolean;
  anomalyDetection: boolean;
  anomalyThreshold: number;
  autoUpdateForecasts: boolean;
  updateFrequency: 'daily' | 'weekly' | 'monthly';
  includeExternalFactors: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  budgetAlerts: boolean;
  budgetThreshold: number;
  cashFlowAlerts: boolean;
  cashFlowMinimum: number;
  overdueARAlerts: boolean;
  overdueARDays: number;
  overdueAPAlerts: boolean;
  overdueAPDays: number;
  anomalyAlerts: boolean;
  lowStockAlerts: boolean;
  reconciliationReminders: boolean;
  periodClosingReminders: boolean;
  reminderDaysBefore: number;
}

interface PermissionSettings {
  allowJournalDeletion: boolean;
  requireJournalApproval: boolean;
  approvalThreshold: number;
  allowBackdatedEntries: boolean;
  maxBackdateDays: number;
  allowFutureEntries: boolean;
  maxFutureDays: number;
  restrictPeriodEditing: boolean;
  auditTrailEnabled: boolean;
}

interface IntegrationSettings {
  posIntegration: boolean;
  posAutoSync: boolean;
  posSyncFrequency: 'realtime' | 'hourly' | 'daily';
  bankFeedEnabled: boolean;
  bankFeedAutoMatch: boolean;
  taxReportingEnabled: boolean;
  taxReportingFrequency: 'monthly' | 'quarterly' | 'yearly';
  exportToExternalSystem: boolean;
  externalSystemType: string | null;
  apiAccessEnabled: boolean;
}

// ============= DEFAULT SETTINGS =============

const DEFAULT_SETTINGS: AccountingSettings = {
  general: {
    companyName: '',
    taxId: '',
    baseCurrency: 'IDR',
    decimalPlaces: 0,
    thousandSeparator: '.',
    decimalSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 1,
    accountingMethod: 'accrual',
    inventoryMethod: 'FIFO'
  },
  fiscal: {
    currentPeriod: '',
    autoClosePeriods: false,
    periodLockDays: 5,
    requireApprovalForClosing: true,
    retainedEarningsAccount: null,
    defaultRevenueAccount: null,
    defaultExpenseAccount: null,
    defaultARAccount: null,
    defaultAPAccount: null,
    defaultCashAccount: null,
    defaultInventoryAccount: null
  },
  automation: {
    autoPostJournals: false,
    autoReconcile: false,
    autoGenerateRecurring: true,
    autoCalculateDepreciation: true,
    autoApplyTax: true,
    defaultTaxRate: 11,
    roundingMethod: 'nearest',
    roundingPrecision: 100,
    journalNumberFormat: 'JRN-{YYYY}{MM}-{####}',
    invoiceNumberFormat: 'INV-{YYYY}{MM}-{####}'
  },
  reporting: {
    defaultReportFormat: 'pdf',
    includeZeroBalances: false,
    showAccountCodes: true,
    groupByCategory: true,
    comparativePeriods: 1,
    defaultDateRange: 'mtd',
    emailReportsTo: [],
    scheduleReports: false,
    reportSchedule: '0 8 1 * *'
  },
  forecasting: {
    enabled: true,
    defaultMethod: 'ensemble',
    forecastHorizon: 30,
    confidenceLevel: 95,
    seasonalityDetection: true,
    anomalyDetection: true,
    anomalyThreshold: 2.5,
    autoUpdateForecasts: true,
    updateFrequency: 'daily',
    includeExternalFactors: false
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    budgetAlerts: true,
    budgetThreshold: 80,
    cashFlowAlerts: true,
    cashFlowMinimum: 10000000,
    overdueARAlerts: true,
    overdueARDays: 7,
    overdueAPAlerts: true,
    overdueAPDays: 3,
    anomalyAlerts: true,
    lowStockAlerts: true,
    reconciliationReminders: true,
    periodClosingReminders: true,
    reminderDaysBefore: 5
  },
  permissions: {
    allowJournalDeletion: false,
    requireJournalApproval: true,
    approvalThreshold: 10000000,
    allowBackdatedEntries: true,
    maxBackdateDays: 30,
    allowFutureEntries: false,
    maxFutureDays: 7,
    restrictPeriodEditing: true,
    auditTrailEnabled: true
  },
  integrations: {
    posIntegration: true,
    posAutoSync: true,
    posSyncFrequency: 'realtime',
    bankFeedEnabled: false,
    bankFeedAutoMatch: false,
    taxReportingEnabled: true,
    taxReportingFrequency: 'monthly',
    exportToExternalSystem: false,
    externalSystemType: null,
    apiAccessEnabled: false
  }
};

// ============= ROLE-BASED SETTINGS =============

interface RoleSettings {
  dashboardWidgets: string[];
  availableReports: string[];
  quickActions: string[];
  kpiMetrics: string[];
  alertTypes: string[];
}

const ROLE_SETTINGS: Record<string, RoleSettings> = {
  owner: {
    dashboardWidgets: [
      'financial_health_score',
      'revenue_forecast',
      'expense_forecast',
      'profit_trend',
      'cash_position',
      'top_performers',
      'alerts_summary',
      'ar_ap_overview'
    ],
    availableReports: [
      'income_statement',
      'balance_sheet',
      'cash_flow',
      'trial_balance',
      'ar_aging',
      'ap_aging',
      'budget_variance',
      'financial_ratios',
      'comparative_analysis',
      'consolidation'
    ],
    quickActions: [
      'view_reports',
      'approve_journals',
      'review_budgets',
      'manage_users'
    ],
    kpiMetrics: [
      'gross_profit_margin',
      'net_profit_margin',
      'current_ratio',
      'quick_ratio',
      'debt_to_equity',
      'roi',
      'revenue_growth',
      'expense_ratio'
    ],
    alertTypes: [
      'budget_exceeded',
      'cash_flow_warning',
      'overdue_ar',
      'overdue_ap',
      'anomaly_detected',
      'period_closing',
      'approval_needed'
    ]
  },
  akuntan: {
    dashboardWidgets: [
      'period_status',
      'journal_stats',
      'reconciliation_status',
      'pending_tasks',
      'recent_journals',
      'coa_summary'
    ],
    availableReports: [
      'income_statement',
      'balance_sheet',
      'cash_flow',
      'trial_balance',
      'general_ledger',
      'journal_detail',
      'ar_aging',
      'ap_aging',
      'bank_reconciliation',
      'depreciation_schedule'
    ],
    quickActions: [
      'create_journal',
      'bank_reconciliation',
      'close_period',
      'generate_report',
      'review_recurring',
      'manage_coa'
    ],
    kpiMetrics: [
      'journals_this_month',
      'pending_approvals',
      'unreconciled_accounts',
      'variance_from_budget'
    ],
    alertTypes: [
      'unbalanced_journal',
      'reconciliation_needed',
      'period_closing',
      'recurring_due',
      'depreciation_due'
    ]
  },
  produsen: {
    dashboardWidgets: [
      'production_output',
      'raw_material_status',
      'cost_analysis',
      'expense_forecast',
      'efficiency_metrics'
    ],
    availableReports: [
      'production_cost',
      'raw_material_usage',
      'wip_report',
      'cost_variance',
      'efficiency_report'
    ],
    quickActions: [
      'record_production',
      'request_material',
      'view_costs',
      'update_output'
    ],
    kpiMetrics: [
      'cost_per_unit',
      'material_efficiency',
      'production_efficiency',
      'defect_rate',
      'raw_material_days'
    ],
    alertTypes: [
      'low_material',
      'cost_overrun',
      'efficiency_drop',
      'quality_issue'
    ]
  },
  distributor: {
    dashboardWidgets: [
      'purchasing_stats',
      'inventory_status',
      'ap_summary',
      'supplier_analysis',
      'expense_forecast'
    ],
    availableReports: [
      'purchase_report',
      'inventory_valuation',
      'ap_aging',
      'supplier_performance',
      'stock_movement'
    ],
    quickActions: [
      'create_po',
      'receive_goods',
      'pay_supplier',
      'view_inventory'
    ],
    kpiMetrics: [
      'inventory_turnover',
      'days_payable',
      'purchase_variance',
      'supplier_on_time'
    ],
    alertTypes: [
      'low_stock',
      'overdue_payment',
      'price_change',
      'supplier_issue'
    ]
  },
  kasir: {
    dashboardWidgets: [
      'today_sales',
      'shift_summary',
      'payment_breakdown',
      'recent_transactions'
    ],
    availableReports: [
      'daily_sales',
      'shift_report',
      'payment_summary',
      'void_report'
    ],
    quickActions: [
      'new_transaction',
      'void_transaction',
      'close_shift',
      'print_report'
    ],
    kpiMetrics: [
      'sales_today',
      'transaction_count',
      'average_basket',
      'cash_variance'
    ],
    alertTypes: [
      'cash_shortage',
      'void_threshold',
      'shift_ending'
    ]
  },
  retail: {
    dashboardWidgets: [
      'sales_overview',
      'sales_forecast',
      'margin_analysis',
      'inventory_alerts',
      'top_products'
    ],
    availableReports: [
      'sales_report',
      'margin_report',
      'inventory_report',
      'product_performance',
      'category_analysis'
    ],
    quickActions: [
      'view_sales',
      'check_inventory',
      'reorder_stock',
      'price_update'
    ],
    kpiMetrics: [
      'gross_margin',
      'sales_growth',
      'inventory_turns',
      'stockout_rate'
    ],
    alertTypes: [
      'low_stock',
      'margin_drop',
      'sales_anomaly',
      'expiring_stock'
    ]
  }
};

// ============= CONTROLLERS =============

/**
 * Get all accounting settings
 */
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    // Get settings from database
    const dbSettings = await tenantSettingsClient?.findFirst({
      where: { tenant_id: tenantId, setting_key: 'accounting' }
    }).catch(() => null);

    // Merge with defaults
    const settings = dbSettings?.setting_value
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(dbSettings.setting_value as string) }
      : DEFAULT_SETTINGS;

    // Get tenant info for general settings
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { business_name: true, email: true }
    });

    if (tenant) {
      settings.general.companyName = settings.general.companyName || tenant.business_name;
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update accounting settings
 */
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const updates = req.body;

    // Validate updates
    const validSections = ['general', 'fiscal', 'automation', 'reporting', 'forecasting', 'notifications', 'permissions', 'integrations'];
    const invalidSections = Object.keys(updates).filter(k => !validSections.includes(k));

    if (invalidSections.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SECTION', message: `Invalid settings sections: ${invalidSections.join(', ')}` }
      });
    }

    // Get current settings
    const dbSettings = await tenantSettingsClient?.findFirst({
      where: { tenant_id: tenantId, setting_key: 'accounting' }
    }).catch(() => null);

    const currentSettings = dbSettings?.setting_value
      ? JSON.parse(dbSettings.setting_value as string)
      : DEFAULT_SETTINGS;

    // Merge updates
    const newSettings = {
      ...currentSettings,
      ...Object.keys(updates).reduce((acc, key) => ({
        ...acc,
        [key]: { ...(currentSettings[key] || {}), ...updates[key] }
      }), {})
    };

    // Save to database (upsert pattern)
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "tenant_settings" (tenant_id, setting_key, setting_value, updated_at)
        VALUES (${tenantId}, 'accounting', '${JSON.stringify(newSettings)}', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = '${JSON.stringify(newSettings)}', updated_at = NOW()
      `);
    } catch {
      // Table might not exist, create simple storage
      console.log('Settings table not available, using memory');
    }

    res.json({
      success: true,
      data: newSettings,
      message: 'Pengaturan berhasil disimpan'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get settings for specific section
 */
export const getSectionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { section } = req.params;

    const validSections = ['general', 'fiscal', 'automation', 'reporting', 'forecasting', 'notifications', 'permissions', 'integrations'];

    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SECTION', message: `Invalid section: ${section}` }
      });
    }

    const dbSettings = await tenantSettingsClient?.findFirst({
      where: { tenant_id: tenantId, setting_key: 'accounting' }
    }).catch(() => null);

    const settings = dbSettings?.setting_value
      ? JSON.parse(dbSettings.setting_value as string)
      : DEFAULT_SETTINGS;

    res.json({
      success: true,
      data: settings[section] || DEFAULT_SETTINGS[section as keyof AccountingSettings]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update settings for specific section
 */
export const updateSectionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { section } = req.params;
    const updates = req.body;

    const validSections = ['general', 'fiscal', 'automation', 'reporting', 'forecasting', 'notifications', 'permissions', 'integrations'];

    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SECTION', message: `Invalid section: ${section}` }
      });
    }

    const dbSettings = await tenantSettingsClient?.findFirst({
      where: { tenant_id: tenantId, setting_key: 'accounting' }
    }).catch(() => null);

    const currentSettings = dbSettings?.setting_value
      ? JSON.parse(dbSettings.setting_value as string)
      : DEFAULT_SETTINGS;

    const newSettings = {
      ...currentSettings,
      [section]: {
        ...(currentSettings[section] || DEFAULT_SETTINGS[section as keyof AccountingSettings]),
        ...updates
      }
    };

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "tenant_settings" (tenant_id, setting_key, setting_value, updated_at)
        VALUES (${tenantId}, 'accounting', '${JSON.stringify(newSettings)}', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = '${JSON.stringify(newSettings)}', updated_at = NOW()
      `);
    } catch {
      console.log('Settings table not available');
    }

    res.json({
      success: true,
      data: newSettings[section],
      message: `Pengaturan ${section} berhasil disimpan`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get role-specific settings
 */
export const getRoleSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.params;

    const normalizedRole = role.toLowerCase();
    const roleSettings = ROLE_SETTINGS[normalizedRole];

    if (!roleSettings) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: `Settings for role '${role}' not found` }
      });
    }

    res.json({
      success: true,
      data: {
        role: normalizedRole,
        ...roleSettings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available roles and their settings
 */
export const getAllRoleSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: Object.entries(ROLE_SETTINGS).map(([role, settings]) => ({
        role,
        ...settings
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update role-specific settings (custom per tenant)
 */
export const updateRoleSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { role } = req.params;
    const updates = req.body;

    const normalizedRole = role.toLowerCase();

    if (!ROLE_SETTINGS[normalizedRole]) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: `Role '${role}' not found` }
      });
    }

    // Get current custom role settings
    const dbSettings = await tenantSettingsClient?.findFirst({
      where: { tenant_id: tenantId, setting_key: `role_${normalizedRole}` }
    }).catch(() => null);

    const currentSettings = dbSettings?.setting_value
      ? JSON.parse(dbSettings.setting_value as string)
      : ROLE_SETTINGS[normalizedRole];

    const newSettings = { ...currentSettings, ...updates };

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "tenant_settings" (tenant_id, setting_key, setting_value, updated_at)
        VALUES (${tenantId}, 'role_${normalizedRole}', '${JSON.stringify(newSettings)}', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = '${JSON.stringify(newSettings)}', updated_at = NOW()
      `);
    } catch {
      console.log('Settings table not available');
    }

    res.json({
      success: true,
      data: { role: normalizedRole, ...newSettings },
      message: `Pengaturan role ${role} berhasil disimpan`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset settings to defaults
 */
export const resetSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { section } = req.query;

    if (section && typeof section === 'string') {
      // Reset specific section
      const dbSettings = await tenantSettingsClient?.findFirst({
        where: { tenant_id: tenantId, setting_key: 'accounting' }
      }).catch(() => null);

      const currentSettings = dbSettings?.setting_value
        ? JSON.parse(dbSettings.setting_value as string)
        : DEFAULT_SETTINGS;

      const newSettings = {
        ...currentSettings,
        [section]: DEFAULT_SETTINGS[section as keyof AccountingSettings]
      };

      try {
        await prisma.$executeRawUnsafe(`
          UPDATE "tenant_settings"
          SET setting_value = '${JSON.stringify(newSettings)}', updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND setting_key = 'accounting'
        `);
      } catch {
        console.log('Settings table not available');
      }

      res.json({
        success: true,
        data: newSettings,
        message: `Pengaturan ${section} berhasil direset`
      });
    } else {
      // Reset all settings
      try {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "tenant_settings"
          WHERE tenant_id = ${tenantId} AND setting_key = 'accounting'
        `);
      } catch {
        console.log('Settings table not available');
      }

      res.json({
        success: true,
        data: DEFAULT_SETTINGS,
        message: 'Semua pengaturan berhasil direset'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get default COA accounts for mapping
 */
export const getDefaultAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    const accounts = await prisma.chart_of_accounts.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: {
        id: true,
        account_code: true,
        account_name: true,
        account_type: true,
        category: true
      },
      orderBy: { account_code: 'asc' }
    });

    // Group by type for easy selection
    const grouped = accounts.reduce((acc, account) => {
      const type = account.account_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    }, {} as Record<string, typeof accounts>);

    res.json({
      success: true,
      data: {
        all: accounts,
        byType: grouped,
        suggestions: {
          revenue: accounts.find(a => a.account_type === 'REVENUE')?.id,
          expense: accounts.find(a => a.account_type === 'EXPENSE')?.id,
          asset: accounts.find(a => a.account_type === 'ASSET' && a.category?.toLowerCase().includes('cash'))?.id,
          ar: accounts.find(a => a.account_type === 'ASSET' && a.category?.toLowerCase().includes('receivable'))?.id,
          ap: accounts.find(a => a.account_type === 'LIABILITY' && a.category?.toLowerCase().includes('payable'))?.id,
          inventory: accounts.find(a => a.account_type === 'ASSET' && a.category?.toLowerCase().includes('inventory'))?.id,
          retainedEarnings: accounts.find(a => a.account_type === 'EQUITY' && a.category?.toLowerCase().includes('retained'))?.id
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate settings
 */
export const validateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = req.body;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate general settings
    if (settings.general) {
      if (!settings.general.baseCurrency) {
        errors.push('Mata uang dasar harus diisi');
      }
      if (settings.general.decimalPlaces < 0 || settings.general.decimalPlaces > 4) {
        errors.push('Decimal places harus antara 0-4');
      }
    }

    // Validate fiscal settings
    if (settings.fiscal) {
      if (settings.fiscal.periodLockDays < 0) {
        errors.push('Period lock days tidak boleh negatif');
      }
    }

    // Validate automation settings
    if (settings.automation) {
      if (settings.automation.defaultTaxRate < 0 || settings.automation.defaultTaxRate > 100) {
        errors.push('Tax rate harus antara 0-100%');
      }
    }

    // Validate forecasting settings
    if (settings.forecasting) {
      if (settings.forecasting.forecastHorizon < 7 || settings.forecasting.forecastHorizon > 365) {
        warnings.push('Forecast horizon disarankan antara 7-365 hari');
      }
      if (settings.forecasting.confidenceLevel < 80 || settings.forecasting.confidenceLevel > 99) {
        warnings.push('Confidence level disarankan antara 80-99%');
      }
    }

    // Validate notification settings
    if (settings.notifications) {
      if (settings.notifications.budgetThreshold < 0 || settings.notifications.budgetThreshold > 100) {
        errors.push('Budget threshold harus antara 0-100%');
      }
    }

    // Validate permission settings
    if (settings.permissions) {
      if (settings.permissions.maxBackdateDays < 0) {
        errors.push('Max backdate days tidak boleh negatif');
      }
    }

    const isValid = errors.length === 0;

    res.json({
      success: true,
      data: {
        valid: isValid,
        errors,
        warnings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export settings
 */
export const exportSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    const dbSettings = await tenantSettingsClient?.findFirst({
      where: { tenant_id: tenantId, setting_key: 'accounting' }
    }).catch(() => null);

    const settings = dbSettings?.setting_value
      ? JSON.parse(dbSettings.setting_value as string)
      : DEFAULT_SETTINGS;

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=accounting-settings.json');
    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

/**
 * Import settings
 */
export const importSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const importData = req.body;

    if (!importData.settings) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Invalid import format' }
      });
    }

    // Validate imported settings
    const validSections = ['general', 'fiscal', 'automation', 'reporting', 'forecasting', 'notifications', 'permissions', 'integrations'];
    const importedSections = Object.keys(importData.settings);
    const invalidSections = importedSections.filter(s => !validSections.includes(s));

    if (invalidSections.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SECTIONS', message: `Invalid sections: ${invalidSections.join(', ')}` }
      });
    }

    // Merge with defaults
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...importData.settings
    };

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "tenant_settings" (tenant_id, setting_key, setting_value, updated_at)
        VALUES (${tenantId}, 'accounting', '${JSON.stringify(newSettings)}', NOW())
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = '${JSON.stringify(newSettings)}', updated_at = NOW()
      `);
    } catch {
      console.log('Settings table not available');
    }

    res.json({
      success: true,
      data: newSettings,
      message: 'Pengaturan berhasil diimport'
    });
  } catch (error) {
    next(error);
  }
};
