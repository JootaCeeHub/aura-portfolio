import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  root: './ui',
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: './ui/tailwind.config.js' }), autoprefixer()],
    },
  },
  server: {
    port: 5678,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
