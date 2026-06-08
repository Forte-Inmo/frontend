import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/pdf-api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/pdf-api/, ''),
      }
    }
  }
})
