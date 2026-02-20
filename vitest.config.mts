import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    alias: {
      '@': resolve(__dirname, './src'),
      'server-only': resolve(__dirname, './src/tests/mocks/server-only.ts'),
    },
  },
})
