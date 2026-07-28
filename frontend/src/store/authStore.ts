import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';
import axios from 'axios';
import { useSuperAdminTenantStore } from './superAdminTenantStore';

interface TenantInfo {
  id: number;
  businessName: string;
  // Add other relevant tenant properties if known
}

export interface McsPermissions {
  inbox: boolean;
  analytics: boolean;
  content: boolean;
  ads: boolean;
  settings: boolean;
  marketplace: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  role?: { name: string };
  roles?: { name: string };
  tenant?: TenantInfo;
  tenant_id?: number;
  tenants_users_tenant_idTotenants?: any;
  outletId?: number;
  outlet_id?: number;
  outlets?: any;
  dashboard_preferences?: {
    mcs?: McsPermissions;
    [key: string]: any;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ token: data.data.token, user: data.data.user });
        } catch (error: unknown) {
          console.error('Login failed:', error);
          let errorMessage = 'Login failed';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          throw new Error(errorMessage, { cause: error });
        }
      },

      logout: () => {
        useSuperAdminTenantStore.getState().clearSelectedTenant();
        if (typeof window !== 'undefined' && 'caches' in window) {
          void window.caches.delete('api-cache');
        }
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token
      }),
    }
  )
);
