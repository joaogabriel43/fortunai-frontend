import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration with explicit proxy to Spring Boot backend on port 3333
export default defineConfig({
  plugins: [react()],
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
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // MUI — separate from main bundle
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],

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
  }
})
