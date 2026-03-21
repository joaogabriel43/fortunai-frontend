import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration with explicit proxy to Spring Boot backend on port 3333
export default defineConfig({
  plugins: [react()],
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
