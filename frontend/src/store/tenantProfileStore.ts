import { create } from 'zustand';
import { tenantService } from '../services/tenantService';
import type { Tenant } from '../services/tenantService';
import { useAuthStore } from './authStore';

interface TenantProfileState {
  tenant: Tenant | null;
  loading: boolean;
  loadedTenantId: number | null;
  fetchMyTenant: (force?: boolean) => Promise<Tenant | null>;
  clear: () => void;
}

export const useTenantProfileStore = create<TenantProfileState>((set, get) => ({
  tenant: null,
  loading: false,
  loadedTenantId: null,

  fetchMyTenant: async (force = false) => {
    const authUser = useAuthStore.getState().user;
    const tenantId = authUser?.tenant?.id ?? authUser?.tenant_id ?? null;

    if (!tenantId) {
      set({ tenant: null, loadedTenantId: null, loading: false });
      return null;
    }

    if (!force && get().loadedTenantId === tenantId && get().tenant) {
      return get().tenant;
    }

    set({ loading: true });

    try {
      const tenant = await tenantService.getMyTenant();
      set({ tenant, loadedTenantId: tenant.id, loading: false });
      return tenant;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  clear: () => set({ tenant: null, loading: false, loadedTenantId: null }),
}));
