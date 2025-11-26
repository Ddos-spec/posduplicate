import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import axios from 'axios';

interface TenantInfo {
  id: number;
  businessName: string;
  // Add other relevant tenant properties if known
}

interface User {
  id: number;
  name: string;
  email: string;
  role?: { name: string };
  roles?: { name: string };
  tenant?: TenantInfo;
  outletId?: number;
  outlets?: any;
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
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token
      }),
    }
  )
);
