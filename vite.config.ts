import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Personal Vault',
        short_name: 'Vault',
        description: 'Your personal knowledge vault',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        // FIX: scope and start_url must match the GitHub Pages subdirectory
        scope: basePath,
        start_url: basePath,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: '新增筆記',
            short_name: '筆記',
            description: '快速新增筆記',
            url: 'notes?action=add',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: '新增網址',
            short_name: '網址',
            description: '快速新增書籤',
            url: 'bookmarks?action=add',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: '購物清單',
            short_name: '購物',
            description: '開啟購物清單',
            url: 'shopping',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: '新增倒數',
            short_name: '倒數',
            description: '快速新增日子倒數',
            url: 'countdown?action=add',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
