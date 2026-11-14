import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// The API is proxied so the browser talks to one origin (no CORS changes needed in the backend).
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `npm run analyze` writes dist/stats.html with gzip and brotli sizes per module
    mode === 'analyze' && visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, open: false }),
  ],
  server: { proxy: { '/api': 'http://localhost:8000' } },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Vendor groups. `three` is only imported by the lazy Scene chunk, so it never
        // lands in the entry or its modulepreload list.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'three'
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion'
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react'
        },
      },
    },
  },
}))
