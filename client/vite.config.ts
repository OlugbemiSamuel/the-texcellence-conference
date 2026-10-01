import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Learn: proxy forwards /api calls to Express so you avoid CORS issues in dev.
// Browser -> Vite (:5173) -> proxy -> Express (:5000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
