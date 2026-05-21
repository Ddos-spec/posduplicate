import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../store/authStore';
import { useSuperAdminTenantStore } from '../store/superAdminTenantStore';

// Determine API URL dynamically to support LAN/Mobile testing
const getBaseUrl = () => {
  const isNativeApp = Capacitor.isNativePlatform();
  const configuredApiUrl = isNativeApp
    ? import.meta.env.VITE_MOBILE_API_URL || import.meta.env.VITE_API_URL
    : import.meta.env.VITE_API_URL;

  // If API URL is explicitly set, use it
  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  // Capacitor Android uses a localhost webview origin, so avoid routing native
  // app traffic back to the device itself unless we're intentionally on emulator.
  if (isNativeApp) {
    return 'http://10.0.2.2:3000/api';
  }

  // If running on localhost/127.0.0.1, default to localhost:3000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }

  // On web production, prefer same-origin proxy/rewrite so clients don't need
  // to resolve the backend host directly.
  return '/api';
};

const API_URL = getBaseUrl();

const getAssetBaseUrl = () => {
  if (/^https?:\/\//i.test(API_URL)) {
    return API_URL.replace(/\/api\/?$/, '');
  }

  if (API_URL.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  return API_URL.replace(/\/api\/?$/, '');
};

// Extract base URL (without /api) for full URL construction
export const BASE_URL = getAssetBaseUrl();

// Helper function to get full URL from relative path
export const getFullUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  return BASE_URL ? `${BASE_URL}${relativePath}` : relativePath;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const user = useAuthStore.getState().user;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  const isSuperAdmin = roleName === 'super admin' || roleName === 'super_admin';
  const selectedTenant = useSuperAdminTenantStore.getState().selectedTenant;

  if (isSuperAdmin && selectedTenant?.id) {
    config.headers['X-Tenant-ID'] = String(selectedTenant.id);
  }

  return config;
});

// Handle 401 errors (logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
