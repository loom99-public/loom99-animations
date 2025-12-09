import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: '../animations/*',
          dest: 'animations'
        }
      ]
    })
  ],
  server: {
    host: '0.0.0.0',
    fs: {
      // Allow serving files from the parent animations directory
      allow: ['..'],
    },
  },
});
