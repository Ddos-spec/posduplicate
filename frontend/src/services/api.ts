import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../store/authStore';

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

  // If running on a LAN IP or VPS, match the current protocol (HTTP or HTTPS)
  // This prevents "Mixed Content" errors if the PWA is served over HTTPS
  const protocol = window.location.protocol; // 'http:' or 'https:'
  return `${protocol}//${window.location.hostname}:3000/api`;
};

const API_URL = getBaseUrl();

// Extract base URL (without /api) for full URL construction
export const BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Helper function to get full URL from relative path
export const getFullUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  return `${BASE_URL}${relativePath}`;
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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
