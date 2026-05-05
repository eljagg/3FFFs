import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // v25.7.1.1: Read env from BOTH the local working dir (for .env.production
  // checked into the repo) AND from process.env (for Railway's build-time
  // injected vars). The third arg `''` is the prefix filter — empty string
  // means "include everything from process.env" instead of only VITE_-prefixed
  // values from .env files. This is what was missing — `loadEnv(mode, '../')`
  // looked at the parent dir of /client (repo root), where no .env file
  // lives, so all VITE_* references in the React code were resolving to
  // undefined at build time, which silently disabled the Auth0Provider.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: '3fffs — Fraud Framework Training',
          short_name: '3fffs',
          description: 'Interactive MITRE F3 training for financial institutions',
          theme_color: '#1a1a1a',
          background_color: '#f4f1e8',
          display: 'standalone',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': { target: apiUrl, changeOrigin: true },
      },
    },
    define: {
      __API_URL__: JSON.stringify(apiUrl),
    },
  }
})
