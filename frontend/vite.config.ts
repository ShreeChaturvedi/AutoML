import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure React is deduplicated to prevent multiple instances
    dedupe: ['react', 'react-dom'],
  },
  // DuckDB-WASM configuration
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'], // Don't pre-bundle WASM
    esbuildOptions: {
      target: 'esnext', // Required for top-level await
    },
  },
  worker: {
    format: 'es', // Use ES modules in workers
    plugins: () => [react()],
  },
  // Ensure WASM files and worker scripts are treated as assets
  assetsInclude: ['**/*.wasm', '**/*.worker.js'],
  server: {
    // Enable SharedArrayBuffer support (required for DuckDB threading)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
