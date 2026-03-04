/**
 * UI helper module
 * Provides DOM manipulation and display utilities
 */

/**
 * Escape HTML entities to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date for display in Czech locale
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('cs-CZ', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {string} dateString - Date string to format
 * @returns {string} ISO date string
 */
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Show status message in a status element
 * @param {HTMLElement} statusElement - Element to show status in
 * @param {string} message - Status message
 * @param {string} type - Status type: 'success', 'error', or 'info'
 * @param {number} autoHideDelay - Auto-hide delay in ms (0 to disable)
 */
function showStatus(statusElement, message, type, autoHideDelay = 0) {
  statusElement.textContent = message;
  statusElement.className = `status show ${type}`;
  
  if (autoHideDelay > 0 && (type === 'success' || type === 'info')) {
    setTimeout(() => {
      statusElement.className = 'status';
    }, autoHideDelay);
  }
}

/**
 * Deduplicate quotes array
 * @param {Array} quotes - Array of quote objects
 * @returns {Array} Deduplicated array
 */
function deduplicateQuotes(quotes) {
  const seen = new Set();
  return (quotes || []).filter(q => {
    const key = `${q.date}|${q.text}`;
    if (seen.has(key)) {
      console.log('Duplicate filtered out:', q);
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Check if a quote is a duplicate
 * @param {Array} quotes - Existing quotes
 * @param {string} text - Quote text to check
 * @param {string} date - Quote date to check
 * @returns {boolean} True if duplicate
 */
function isDuplicate(quotes, text, date) {
  return quotes.some(q => 
    q.text === text && formatDateForInput(q.date) === date
  );
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Export for use in other modules and tests
if (typeof window !== 'undefined') {
  window.QuotesUI = {
    escapeHtml,
    formatDate,
    formatDateForInput,
    showToast,
    showStatus,
    deduplicateQuotes,
    isDuplicate,
    getTodayDate
  };
}
