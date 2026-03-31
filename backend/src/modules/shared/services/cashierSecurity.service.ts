import bcrypt from 'bcrypt';
import prisma from '../../../utils/prisma';

const SUPERVISOR_PIN_MIN_LENGTH = 4;
const SUPERVISOR_PIN_MAX_LENGTH = 8;
const SUPERVISOR_PIN_SALT_ROUNDS = 10;

const PIN_BYPASS_ROLES = new Set(['Owner', 'Manager', 'Admin', 'Super Admin', 'super_admin']);

const PROTECTED_ACTIONS = [
  'Hapus item dari keranjang',
  'Kurangi qty item di keranjang',
  'Batalkan atau void transaksi',
  'Refund transaksi',
  'Hapus transaksi'
];

export interface CashierSecuritySettings {
  supervisorPinEnabled: boolean;
  supervisorPinConfigured: boolean;
  protectedActions: string[];
}

interface StoredCashierSecuritySettings {
  supervisorPinEnabled: boolean;
  supervisorPinHash: string | null;
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const normalizeStoredCashierSecuritySettings = (value: unknown): StoredCashierSecuritySettings => {
  const candidate = toRecord(value);
  const supervisorPinEnabled = candidate.supervisorPinEnabled === true;
  const supervisorPinHash = typeof candidate.supervisorPinHash === 'string' && candidate.supervisorPinHash.trim().length > 0
    ? candidate.supervisorPinHash
    : null;

  return {
    supervisorPinEnabled,
    supervisorPinHash
  };
};

const validateSupervisorPinFormat = (pin: string) => {
  const trimmedPin = pin.trim();

  if (!/^\d+$/.test(trimmedPin)) {
    throw new Error('PIN supervisor hanya boleh berisi angka.');
  }

  if (trimmedPin.length < SUPERVISOR_PIN_MIN_LENGTH || trimmedPin.length > SUPERVISOR_PIN_MAX_LENGTH) {
    throw new Error(`PIN supervisor harus ${SUPERVISOR_PIN_MIN_LENGTH}-${SUPERVISOR_PIN_MAX_LENGTH} digit.`);
  }

  return trimmedPin;
};

export const normalizeCashierSecuritySettings = (value: unknown): CashierSecuritySettings => {
  const normalized = normalizeStoredCashierSecuritySettings(value);

  return {
    supervisorPinEnabled: normalized.supervisorPinEnabled,
    supervisorPinConfigured: Boolean(normalized.supervisorPinHash),
    protectedActions: [...PROTECTED_ACTIONS]
  };
};

export const buildCashierSecuritySettingsUpdate = async (
  existingValue: unknown,
  incomingValue: unknown
): Promise<StoredCashierSecuritySettings> => {
  const existing = normalizeStoredCashierSecuritySettings(existingValue);
  const candidate = toRecord(incomingValue);

  const supervisorPinEnabled = typeof candidate.supervisorPinEnabled === 'boolean'
    ? candidate.supervisorPinEnabled
    : existing.supervisorPinEnabled;

  let supervisorPinHash = existing.supervisorPinHash;

  if (typeof candidate.supervisorPin === 'string' && candidate.supervisorPin.trim().length > 0) {
    const normalizedPin = validateSupervisorPinFormat(candidate.supervisorPin);
    supervisorPinHash = await bcrypt.hash(normalizedPin, SUPERVISOR_PIN_SALT_ROUNDS);
  }

  if (supervisorPinEnabled && !supervisorPinHash) {
    throw new Error('PIN supervisor wajib diisi sebelum proteksi kasir diaktifkan.');
  }

  return {
    supervisorPinEnabled,
    supervisorPinHash
  };
};

export const shouldBypassSupervisorPin = (role?: string | null) => PIN_BYPASS_ROLES.has(String(role || ''));

export const getTenantCashierSecuritySettings = async (tenantId?: number | null) => {
  if (!tenantId) {
    return normalizeCashierSecuritySettings(null);
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { settings: true }
  });

  const settings = toRecord(tenant?.settings);
  return normalizeCashierSecuritySettings(settings.cashierSecurity);
};

export const requiresSupervisorPinForRole = async (tenantId?: number | null, role?: string | null) => {
  if (!tenantId || shouldBypassSupervisorPin(role)) {
    return false;
  }

  const cashierSecurity = await getTenantCashierSecuritySettings(tenantId);
  return cashierSecurity.supervisorPinEnabled && cashierSecurity.supervisorPinConfigured;
};

export const verifyCashierSupervisorPin = async (tenantId: number, pin: string) => {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { settings: true }
  });

  const settings = toRecord(tenant?.settings);
  const cashierSecurity = normalizeStoredCashierSecuritySettings(settings.cashierSecurity);

  if (!cashierSecurity.supervisorPinEnabled) {
    return {
      enabled: false,
      configured: Boolean(cashierSecurity.supervisorPinHash),
      valid: true
    };
  }

  if (!cashierSecurity.supervisorPinHash) {
    return {
      enabled: true,
      configured: false,
      valid: false
    };
  }

  if (typeof pin !== 'string' || pin.trim().length === 0) {
    return {
      enabled: true,
      configured: true,
      valid: false
    };
  }

  const normalizedPin = pin.trim();
  const valid = await bcrypt.compare(normalizedPin, cashierSecurity.supervisorPinHash);

  return {
    enabled: true,
    configured: true,
    valid
  };
};
