// Centralized version configuration
const APP_VERSION = '1.2.6';

// For use in service worker
if (typeof self !== 'undefined') {
  self.APP_VERSION = APP_VERSION;
  self.CACHE_NAME = `citaty-syna-v${APP_VERSION}`;
}

// For use in main app
if (typeof window !== 'undefined') {
  window.APP_VERSION = APP_VERSION;
}