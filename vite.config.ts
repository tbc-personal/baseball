import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Short Season',
        short_name: 'Short Season',
        description: 'A tiny, turn-based baseball game for two-minute breaks',
        theme_color: '#b5402c',
        background_color: '#f4eee0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/baseball/',
        scope: '/baseball/',
        icons: [
          {
            src: '/baseball/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/baseball/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/baseball/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/baseball/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  base: '/baseball/',
});
