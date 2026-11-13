import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// В разработке запросы к API и картинкам проксируются на FastAPI (:8000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
