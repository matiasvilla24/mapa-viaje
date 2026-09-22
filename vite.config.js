import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mapa del viaje',
        short_name: 'Mapa viaje',
        description: 'Mapa colaborativo del viaje familiar — dic 25 a ene 10',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#059669',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea solo la interfaz (HTML/JS/CSS/íconos); cualquier llamada a
        // Supabase queda fuera para no mostrar datos viejos nunca.
        navigateFallback: '/index.html',
        // Nunca interceptar llamadas al backend de Supabase: datos siempre frescos
        navigateFallbackDenylist: [/\/rest\//, /\/realtime\//, /\/auth\//],
        runtimeCaching: [],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
