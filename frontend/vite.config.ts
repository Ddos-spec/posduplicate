import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
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
  optimizeDeps: {
    include: ['lucide-react'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // lucide-react separate chunk (fixes undefined export issue)
            // if (id.includes('lucide-react')) {
            //   return 'vendor-icons';
            // }
            // Core React libs (keep together)
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Charts (lazy loaded)
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            // PDF libs (lazy loaded)
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            // Excel (lazy loaded)
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            // Keep axios, zustand, hot-toast together
            if (id.includes('axios') || id.includes('zustand') || id.includes('react-hot-toast')) {
              return 'vendor-core';
            }
            // Everything else
            return 'vendor';
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
