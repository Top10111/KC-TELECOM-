import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// KC TELECOM frontend — talks to the existing NestJS backend at
// VITE_API_BASE_URL (see .env.example). No backend code is touched here.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: 'all',
  },
});
