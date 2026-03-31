import type { TenantSettings } from '../services/settingsService';

const PIN_BYPASS_ROLES = new Set(['Owner', 'Manager', 'Admin', 'Super Admin', 'super_admin']);

export const getUserRoleName = (user: {
  role?: { name?: string | null } | null;
  roles?: { name?: string | null } | null;
} | null | undefined) => user?.roles?.name || user?.role?.name || '';

export const shouldBypassSupervisorPin = (roleName?: string | null) => PIN_BYPASS_ROLES.has(String(roleName || ''));

export const requiresCashierSupervisorPin = (
  settings: Pick<TenantSettings, 'cashierSecurity'> | null | undefined,
  roleName?: string | null
) => {
  if (shouldBypassSupervisorPin(roleName)) {
    return false;
  }

  return Boolean(
    settings?.cashierSecurity?.supervisorPinEnabled &&
    settings?.cashierSecurity?.supervisorPinConfigured
  );
};
