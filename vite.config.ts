import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function normalizeBase(value: string | undefined): string {
  if (!value || value === '/') {
    return '/';
  }

  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBase(env.VITE_BASE_PATH);

  return {
    base,
    plugins: [
      VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icon-72x72.png',
        'icon-96x96.png',
        'icon-128x128.png',
        'icon-144x144.png',
        'icon-152x152.png',
        'icon-192x192.png',
        'icon-384x384.png',
        'icon-512x512.png'
      ],
      manifest: {
        name: 'Hlášky',
        short_name: 'Hlášky',
        description: 'Sledování a ukládání nezapomenutelných citátů',
        start_url: '.',
        scope: base,
        display: 'standalone',
        background_color: '#f8f9fa',
        theme_color: '#007bff',
        orientation: 'portrait-primary',
        lang: 'cs-CZ',
        icons: [
          { src: 'icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icon-152x152.png', sizes: '152x152', type: 'image/png' },
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        skipWaiting: false,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/script\.google\.com\/macros\/s\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quotes-api',
              networkTimeoutSeconds: 8,
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 5
              }
            }
          }
        ]
      }
      })
    ]
  };
});
