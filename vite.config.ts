/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'VueAutoCombo',
      fileName: 'vue-auto-combo',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: (assetInfo) =>
          assetInfo.names?.some((n) => n.endsWith('.css')) ? 'vue-auto-combo.css' : '[name][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
    globals: true,
  },
})
