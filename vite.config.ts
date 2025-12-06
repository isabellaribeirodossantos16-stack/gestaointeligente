import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // A configuração 'base: "./"' é CRUCIAL para o GitHub Pages.
  // Ela garante que os arquivos (js/css) sejam buscados relativamente à pasta atual.
  base: './', 
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});