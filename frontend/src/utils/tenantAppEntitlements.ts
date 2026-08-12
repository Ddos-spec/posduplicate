export type TenantAppEntitlements = Record<string, boolean>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Granular app entitlements live under features.apps while the existing
 * features.modules object remains the coarse bundle gate. This keeps all
 * existing tenants backwards-compatible and lets the suite grow to dozens
 * of independently provisioned applications.
 *
 * Example:
 * {
 *   modules: { pos: true, accounting: true, inventory: true, commerSocial: true },
 *   apps: { payroll: false, crm: true, quality: true }
 * }
 */
export const normalizeTenantAppEntitlements = (rawFeatures: unknown): TenantAppEntitlements => {
  if (!isRecord(rawFeatures) || !isRecord(rawFeatures.apps)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawFeatures.apps)
      .filter(([, value]) => typeof value === 'boolean')
      .map(([key, value]) => [key, value as boolean])
  );
};

/**
 * Bundle access is authoritative. A granular app override can only narrow
 * or explicitly enable an app inside a bundle that the tenant already owns.
 * Missing app overrides default to enabled to preserve legacy tenants.
 */
export const hasTenantAppAccess = (
  rawFeatures: unknown,
  appId: string,
  bundleEnabled: boolean
): boolean => {
  if (!bundleEnabled) return false;
  const entitlements = normalizeTenantAppEntitlements(rawFeatures);
  return entitlements[appId] !== false;
};

export const setTenantAppEntitlement = (
  rawFeatures: unknown,
  appId: string,
  enabled: boolean
): Record<string, unknown> => {
  const preserved = isRecord(rawFeatures) ? rawFeatures : {};
  const currentApps = normalizeTenantAppEntitlements(rawFeatures);

  return {
    ...preserved,
    apps: {
      ...currentApps,
      [appId]: enabled,
    },
  };
};

export const mergeTenantAppEntitlements = (
  rawFeatures: unknown,
  nextEntitlements: TenantAppEntitlements
): Record<string, unknown> => {
  const preserved = isRecord(rawFeatures) ? rawFeatures : {};
  return {
    ...preserved,
    apps: {
      ...normalizeTenantAppEntitlements(rawFeatures),
      ...nextEntitlements,
    },
  };
};
