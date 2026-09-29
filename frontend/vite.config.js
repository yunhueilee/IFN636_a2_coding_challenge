import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // local only: frontend calls /api, Vite forwards to Express
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
})
