import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.easypanel\.host\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'MyPOS',
        short_name: 'MyPOS',
        description: 'Multi-tenant POS System',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo.webp',
            sizes: '192x192',
            type: 'image/webp',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2015',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('axios') || id.includes('zustand')) {
              return 'vendor-core';
            }
            return 'vendor-misc';
          }
          // Page chunks
          if (id.includes('/pages/owner/')) {
            return 'pages-owner';
          }
          if (id.includes('/pages/admin/')) {
            return 'pages-admin';
          }
          if (id.includes('/pages/CashierPage')) {
            return 'pages-cashier';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
    host: true,
  },
})
