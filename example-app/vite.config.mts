import { defineConfig } from 'vite'
import path from 'path'
// import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  optimizeDeps: {
    entries: ['index.html', '!**/ios/**', '!**/android/**', '!**/DerivedData/**'],
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    // tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Use workspace package source so local changes are picked up
      // 'ppal-db': path.resolve(__dirname, './packages/ppal-db/src/index.ts'),
      // 'ppal-llm': path.resolve(__dirname, './packages/ppal-llm/src/index.ts'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('motion/') || id.includes('motion-react')) return 'motion';
            if (id.includes('recharts')) return 'recharts';
          }
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    host: true, // Listen on all addresses, including LAN and public addresses
    fs: {
      // Don't serve or read from native build dirs (avoids GRDB/SQLite wasm in ios/DerivedData)
      deny: ['**/ios/**', '**/android/**', '**/DerivedData/**'],
    },
  },
})
