import { create } from 'zustand';

type BusinessType = 'fnb' | 'pharmacy' | 'retail';

interface InventoryConfigState {
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
}

export const useInventoryConfig = create<InventoryConfigState>((set) => ({
  businessType: 'fnb', // Default
  setBusinessType: (type) => set({ businessType: type }),
}));
