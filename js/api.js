/**
 * API module for Google Apps Script communication
 * Handles JSONP requests with retry logic and exponential backoff
 */

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second base delay

/**
 * Calculate delay for exponential backoff
 * @param {number} attempt - Current attempt number (1-based)
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attempt) {
  return BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
}

/**
 * Perform a single JSONP fetch attempt
 * @param {URL} url - URL to fetch from
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Resolves with data or rejects on error/timeout
 */
function attemptJSONPFetch(url, timeout) {
  return new Promise((resolve, reject) => {
    const jsonpUrl = new URL(url);
    const callbackName = 'quotesCallback' + Date.now();
    jsonpUrl.searchParams.set('callback', callbackName);
    
    const script = document.createElement('script');
    
    const cleanup = () => {
      if (window[callbackName]) {
        delete window[callbackName];
      }
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
    
    // Use longer timeout for better reliability
    const timeoutId = setTimeout(() => {
      console.log('JSONP timeout reached');
      cleanup();
      reject(new Error('Požadavek vypršel - server neodpovídá'));
    }, timeout * 1.5);
    
    // Set up callback function
    window[callbackName] = (data) => {
      console.log('JSONP callback received data:', data);
      clearTimeout(timeoutId);
      cleanup();
      resolve(data);
    };
    
    script.onerror = () => {
      console.log('JSONP script failed to load');
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error('Nepodařilo se načíst data ze serveru'));
    };
    
    script.src = jsonpUrl.toString();
    document.head.appendChild(script);
  });
}

/**
 * Fetch with retry and exponential backoff
 * @param {URL} url - URL to fetch from
 * @param {number} timeout - Timeout per request
 * @param {number} retries - Maximum number of retries
 * @returns {Promise} Resolves with data or null if all retries fail
 */
async function fetchWithRetry(url, timeout, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`JSONP attempt ${attempt}/${retries}`);
    
    try {
      const data = await attemptJSONPFetch(url, timeout);
      return data;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < retries) {
        const delay = calculateRetryDelay(attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return null; // All retries failed
}

/**
 * Save quote using fetch method (no-cors mode)
 * @param {URL} url - URL with quote parameters
 * @returns {Promise} Resolves when request is sent
 */
async function saveWithFetch(url) {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'no-cors'
  });
  console.log('Fetch completed successfully');
  return response;
}

/**
 * Save quote using image fallback method
 * Works when fetch fails due to CORS restrictions
 * @param {URL} url - URL with quote parameters
 * @returns {Promise} Resolves when request is sent
 */
function saveWithImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const handleComplete = () => {
      console.log('Image method completed');
      resolve();
    };
    img.onload = handleComplete;
    img.onerror = handleComplete; // Even on "error", the request was likely sent
    
    // Add a timestamp to prevent caching
    const imageUrl = url.toString() + '&_t=' + Date.now();
    img.src = imageUrl;
  });
}

// Export for use in other modules and tests
if (typeof window !== 'undefined') {
  window.QuotesAPI = {
    MAX_RETRIES,
    BASE_RETRY_DELAY,
    calculateRetryDelay,
    attemptJSONPFetch,
    fetchWithRetry,
    saveWithFetch,
    saveWithImage
  };
}
