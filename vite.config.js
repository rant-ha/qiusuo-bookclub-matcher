import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    },
    target: 'esnext'
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: true
  }
})