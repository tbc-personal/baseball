import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

/*
 * Two builds come out of this config, both served by one GitHub Pages site:
 *
 *   stable  -> /baseball/          the release, built from main
 *   preview -> /baseball/preview/  the latest build, from the preview branch
 *
 * BUILD_CHANNEL picks which. See src/buildChannel.ts for what the app does
 * with it, and .github/workflows/deploy.yml for how both are assembled into
 * the single artifact Pages wants.
 */
const channel = process.env.BUILD_CHANNEL === 'preview' ? 'preview' : 'stable';
const isPreview = channel === 'preview';
const base = isPreview ? '/baseball/preview/' : '/baseball/';

/*
 * The preview build ships no service worker, deliberately.
 *
 * The stable worker's scope is /baseball/, which contains /baseball/preview/,
 * so a second worker registered there would be fighting the first for the
 * same pages -- and the usual symptom is the preview serving assets the
 * stable worker precached, which is exactly the bug that would waste a
 * playtest. Offline play is a property of the release; a build you are
 * testing should load the newest code every time.
 */
const pwa = isPreview
  ? []
  : [
    VitePWA({
      registerType: 'autoUpdate',
      /*
       * Keep the release's service worker out of the preview path.
       *
       * Its scope is /baseball/, which contains /baseball/preview/, so
       * without this the worker answers preview navigations from its own
       * precache and serves the release's app at the preview URL. That is
       * not a theoretical worry: it is what happened the first time both
       * builds were served together and the release was visited first.
       * Shipping the preview without a worker of its own does not help,
       * because the problem is this worker, not a missing one.
       */
      workbox: {
        /*
         * Matches the preview path with or without its trailing slash. The
         * server 301s /baseball/preview to /baseball/preview/, but a
         * service worker answers the navigation before the request ever
         * leaves the browser -- so a denylist that required the slash let
         * the slashless URL fall through to this worker, which served the
         * release from its precache and never redirected. Reported from a
         * playtest that typed the URL by hand, which is how anyone types it.
         */
        navigateFallbackDenylist: [/^\/baseball\/preview(\/|$)/],
      },
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
  ];

export default defineConfig({
  plugins: [preact(), ...pwa],
  base,
  define: {
    __BUILD_CHANNEL__: JSON.stringify(channel),
  },
});
