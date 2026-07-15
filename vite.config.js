import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// In production (GitHub Pages) VITE_BASE is set to /<repo-name>/ by the
// deploy workflow so assets and the PWA manifest resolve correctly.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
   build: {
    target: ['es2020', 'chrome90', 'firefox88', 'safari15', 'edge90'],
  },
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Urban Hiker',
        short_name: 'Urban Hiker',
        description: 'Plan and save walkable routes in urban areas',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache OSM tiles and ORS API responses for offline resilience
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/utils/**'],
    },
  },
})
