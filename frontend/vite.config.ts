import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /taxi-booking-app/ (project site),
  // so asset URLs must be prefixed with that subpath — the default '/'
  // emits root-absolute /assets/... paths that 404 on the live preview.
  base: '/taxi-booking-app/',
  server: {
    port: 5173,
    proxy: {
      // Local dev: forward API calls to the FastAPI backend on :8000.
      '/api': 'http://localhost:8000',
    },
  },
})
