import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
      '/static': 'http://localhost:8000',
      '/sw.js': 'http://localhost:8000',
    },
  },
})
