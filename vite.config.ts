import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
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
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        // P7-J: PWA Shortcuts — long-press app icon to quick-add
        shortcuts: [
          {
            name: '新增筆記',
            short_name: '筆記',
            description: '快速新增筆記',
            url: (process.env.VITE_BASE_PATH || '/') + '#/notes?action=add',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: '新增網址',
            short_name: '網址',
            description: '快速新增書籤',
            url: (process.env.VITE_BASE_PATH || '/') + '#/bookmarks?action=add',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: '購物清單',
            short_name: '購物',
            description: '開啟購物清單',
            url: (process.env.VITE_BASE_PATH || '/') + '#/shopping',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: '新增倒數',
            short_name: '倒數',
            description: '快速新增日子倒數',
            url: (process.env.VITE_BASE_PATH || '/') + '#/countdown?action=add',
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
