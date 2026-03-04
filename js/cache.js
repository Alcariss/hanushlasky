/**
 * Cache management module for quotes
 * Provides localStorage-based caching with stale-while-revalidate support
 */

// Cache keys
const CACHE_KEY = 'hanuhlasky_quotes_cache';
const CACHE_TIMESTAMP_KEY = 'hanuhlasky_cache_timestamp';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached quotes from localStorage
 * @returns {Array|null} Cached quotes array or null if not found
 */
function getCachedQuotes() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Error reading cache:', e);
  }
  return null;
}

/**
 * Store quotes in localStorage cache
 * @param {Array} quotes - Array of quote objects to cache
 */
function setCachedQuotes(quotes) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quotes));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Error writing cache:', e);
  }
}

/**
 * Get the age of the cache in milliseconds
 * @returns {number} Cache age in ms, or Infinity if no cache
 */
function getCacheAge() {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (timestamp) {
      return Date.now() - parseInt(timestamp);
    }
  } catch (e) {
    console.warn('Error reading cache timestamp:', e);
  }
  return Infinity;
}

/**
 * Check if the cache is still valid (within max age)
 * @returns {boolean} True if cache is valid
 */
function isCacheValid() {
  return getCacheAge() < CACHE_MAX_AGE;
}

/**
 * Invalidate the cache by removing timestamp
 * Data is preserved but marked as stale
 */
function invalidateCache() {
  try {
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (e) {
    console.warn('Error invalidating cache:', e);
  }
}

/**
 * Optimistically add a quote to cache immediately
 * Used for instant UI feedback before server confirmation
 * @param {string} quote - Quote text
 * @param {string} date - Quote date
 */
function addQuoteToCache(quote, date) {
  try {
    const cached = getCachedQuotes() || [];
    // Add to beginning (newest first)
    cached.unshift({ text: quote, date: date });
    setCachedQuotes(cached);
    console.log('Quote added to cache optimistically');
  } catch (e) {
    console.warn('Error adding quote to cache:', e);
  }
}

/**
 * Format cache age as human-readable text
 * @param {number} cacheAge - Age in milliseconds
 * @returns {string} Formatted age string
 */
function formatCacheAgeText(cacheAge) {
  if (cacheAge < 60000) return 'před chvílí';
  if (cacheAge < 3600000) return `před ${Math.floor(cacheAge / 60000)} min`;
  return `před ${Math.floor(cacheAge / 3600000)} hod`;
}

// Export for use in other modules and tests
if (typeof window !== 'undefined') {
  window.QuotesCache = {
    CACHE_KEY,
    CACHE_TIMESTAMP_KEY,
    CACHE_MAX_AGE,
    getCachedQuotes,
    setCachedQuotes,
    getCacheAge,
    isCacheValid,
    invalidateCache,
    addQuoteToCache,
    formatCacheAgeText
  };
}
