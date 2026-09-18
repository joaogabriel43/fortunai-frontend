import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { apiRuntimeCaching } from './src/pwa/apiRuntimeCaching.js'

// Vite configuration with explicit proxy to Spring Boot backend on port 3333
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pondero — Organização Financeira',
        short_name: 'Pondero',
        description: 'Organize orçamento, investimentos e IR em uma visão integrada',
        theme_color: '#09100E',
        background_color: '#09100E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Script auxiliar do SW — importado, nao precacheado (ver importScripts)
        globIgnores: ['sw-purge-caches.js'],
        // F-01: purga do 'api-cache' legado no activate, para instalacoes que
        // ja tem SW antigo + Cache Storage populado com resposta autenticada.
        importScripts: ['/sw-purge-caches.js'],
        // F-01: allowlist positiva. Nada sob /api/** e cacheado por padrao;
        // ver src/pwa/apiRuntimeCaching.js para o criterio de classificacao.
        runtimeCaching: apiRuntimeCaching,
        // robots.txt, sitemap.xml e llms.txt sao arquivos estaticos para crawlers:
        // sem a denylist, um navegador com o SW ativo cairia no navigateFallback
        // (index.html) ao abrir essas URLs diretamente.
        navigateFallbackDenylist: [/^\/robots\.txt$/, /^\/sitemap\.xml$/, /^\/llms\.txt$/]
      }
    })
  ],
  resolve: {
    alias: {
      // Alias '@' -> /src (usado pelo design system D4: '@/theme', '@/components/ui')
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    // sockjs-client uses Node.js `global` — map it to browser globalThis
    global: 'globalThis',
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — separated for long-term cache
          'vendor-react': ['react', 'react-dom', 'react-router-dom', '@emotion/react', '@emotion/styled'],

          // MUI — separate from main bundle
          'vendor-mui': ['@mui/material', '@mui/icons-material'],

          // Recharts — heavy, changes rarely, benefits from long cache
          'vendor-recharts': ['recharts'],

          // WebSocket — CJS bundle, not tree-shakeable, isolate
          'vendor-websocket': ['sockjs-client', '@stomp/stompjs'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333', // Backend Spring Boot server
        changeOrigin: true,
        secure: false,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    // .claude/** exclui worktrees de agente criados dentro do repo — sem isso o
    // vitest varre a cópia inteira (specs e2e do Playwright quebram e testes duplicam)
    exclude: ['e2e/**', 'node_modules/**', '.claude/**', '**/.claude/**'],
    // pool 'forks' (default) satura no Windows: os workers via child_process.fork
    // travam em timeout do fork antes de iniciar quando o pool inteiro é
    // agendado de uma vez, deixando ~34 dos 81 arquivos sem nunca rodar.
    // 'threads' usa worker_threads (mesmo processo), sem esse limite do SO,
    // mas ainda assim workers demais de uma vez saturam a maquina local
    // (setup de ambiente jsdom concorrente) — maxWorkers limita isso.
    // (test.poolOptions.threads.maxThreads foi removido no Vitest 4 — a
    // opção agora é top-level, ver guia de migração do Vitest.)
    pool: 'threads',
    maxWorkers: 4,
  }
})
