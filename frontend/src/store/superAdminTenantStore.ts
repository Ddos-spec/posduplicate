import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectedTenantSnapshot {
  id: number;
  businessName: string;
  ownerName?: string;
  email?: string;
}

interface SuperAdminTenantState {
  selectedTenant: SelectedTenantSnapshot | null;
  setSelectedTenant: (tenant: SelectedTenantSnapshot | null) => void;
  clearSelectedTenant: () => void;
}

export const useSuperAdminTenantStore = create<SuperAdminTenantState>()(
  persist(
    (set) => ({
      selectedTenant: null,
      setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),
      clearSelectedTenant: () => set({ selectedTenant: null }),
    }),
    {
      name: 'super-admin-tenant-storage',
      partialize: (state) => ({
        selectedTenant: state.selectedTenant,
      }),
    }
  )
);
