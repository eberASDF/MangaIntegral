import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const localSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { headers: localSecurityHeaders },
  preview: { headers: localSecurityHeaders },
})
