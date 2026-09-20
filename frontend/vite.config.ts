import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The dev server proxies /api to the FastAPI backend so no CORS or base URL
// configuration is needed during development. Override with VITE_API_URL for
// a deployed backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
    // Allow temporary external testing through a Cloudflare quick tunnel
    // (cloudflared tunnel --url http://localhost:5173). Dev-server setting only.
    allowedHosts: ['.trycloudflare.com'],
  },
})
