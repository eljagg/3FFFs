import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../')
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
