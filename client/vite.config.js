import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MessageMe',
        short_name: 'MessageMe',
        description: 'Modern encrypted real-time messaging',
        theme_color: '#000000',
        background_color: '#ffffff',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: "New Message",
            short_name: "Message",
            description: "Start a new conversation",
            url: "/?action=new-message",
            icons: [{ src: "favicon.svg", sizes: "192x192" }]
          },
          {
            name: "Notifications",
            url: "/?action=notifications",
            icons: [{ src: "favicon.svg", sizes: "192x192" }]
          },
          {
            name: "Calls",
            url: "/?action=calls",
            icons: [{ src: "favicon.svg", sizes: "192x192" }]
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
  },
})
