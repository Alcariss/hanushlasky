/**
 * Global error handling module
 * Catches uncaught errors and unhandled promise rejections
 */

(function() {
  'use strict';
  
  // Error log storage (limited to last 10 errors)
  const errorLog = [];
  const MAX_ERRORS = 10;
  
  /**
   * Log an error with context
   * @param {string} type - Error type
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context
   */
  function logError(type, error, context = {}) {
    const errorEntry = {
      type,
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    errorLog.push(errorEntry);
    if (errorLog.length > MAX_ERRORS) {
      errorLog.shift();
    }
    
    // Log to console with styling
    console.error(
      `%c[${type}]%c ${errorEntry.message}`,
      'color: #e53e3e; font-weight: bold;',
      'color: inherit;',
      context
    );
    
    if (error?.stack) {
      console.error(error.stack);
    }
  }
  
  /**
   * Get all logged errors
   * @returns {Array} Array of error entries
   */
  function getErrorLog() {
    return [...errorLog];
  }
  
  /**
   * Clear the error log
   */
  function clearErrorLog() {
    errorLog.length = 0;
  }
  
  // Global error handler for uncaught exceptions
  window.onerror = function(message, source, lineno, colno, error) {
    logError('UncaughtError', error || message, {
      source,
      lineno,
      colno
    });
    
    // Don't suppress the error - let it appear in console
    return false;
  };
  
  // Global handler for unhandled promise rejections
  window.onunhandledrejection = function(event) {
    logError('UnhandledRejection', event.reason, {
      promise: 'Promise rejected without catch handler'
    });
    
    // Prevent the default handling (console error)
    // since we already logged it
    // event.preventDefault();
  };
  
  // Network error detection
  window.addEventListener('error', function(event) {
    // Check if it's a resource loading error
    if (event.target && (event.target.tagName === 'SCRIPT' || 
        event.target.tagName === 'LINK' || 
        event.target.tagName === 'IMG')) {
      logError('ResourceLoadError', 'Failed to load resource', {
        tagName: event.target.tagName,
        src: event.target.src || event.target.href
      });
    }
  }, true);
  
  // Export for debugging and tests
  window.ErrorHandler = {
    logError,
    getErrorLog,
    clearErrorLog,
    MAX_ERRORS
  };
  
  console.log('%c[ErrorHandler]%c Global error handling initialized', 
    'color: #48bb78; font-weight: bold;', 
    'color: inherit;'
  );
})();
