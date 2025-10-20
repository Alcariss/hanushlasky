const CACHE_NAME = 'sons-quotes-v4';

// Get the current script location to build correct URLs
const baseUrl = self.location.pathname.replace('sw.js', '');
const urlsToCache = [
  baseUrl,
  `${baseUrl}index.html`,
  `${baseUrl}manifest.json`
  // Note: Only cache essential files to avoid 404 errors for missing icons
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Opened cache');
        // Cache files individually to avoid failing on missing resources
        const cachePromises = urlsToCache.map(async (url) => {
          try {
            await cache.add(url);
            console.log('Cached:', url);
          } catch (error) {
            console.warn('Failed to cache:', url, error);
            // Continue with other files even if one fails
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('Cache setup complete');
      })
      .catch((error) => {
        console.log('Cache setup failed:', error);
        // Don't fail installation
        return Promise.resolve();
      })
  );
});

// Fetch Event - Network First Strategy for the main app
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests (like Google Apps Script)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, clone and cache it
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try to get from cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // If not in cache and it's the main page, return index.html
            if (event.request.mode === 'navigate') {
              return caches.match(`${baseUrl}index.html`) || caches.match(baseUrl);
            }
            throw new Error('No cached version available');
          });
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync for offline quote saving (optional enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'save-quote') {
    console.log('Background sync triggered for saving quote');
    // You could implement offline quote queuing here
  }
});

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-32.png'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});