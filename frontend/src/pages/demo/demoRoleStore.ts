import { create } from 'zustand';

export type DemoRole = 
  | 'inventory_manager' | 'stock_keeper' | 'purchasing' 
  | 'medsos_manager' | 'content_creator' | 'medsos_cs'
  | 'super_admin'; // Default fallback

interface DemoUserState {
  currentRole: DemoRole;
  setRole: (role: DemoRole) => void;
}

export const useDemoUser = create<DemoUserState>((set) => ({
  currentRole: 'super_admin',
  setRole: (role) => set({ currentRole: role }),
}));
