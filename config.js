// App Configuration
// Edit these values to customize the app for your child

const APP_CONFIG = {
  // Google Apps Script deployment URL
  SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL',
  
  // Google Sheet ID (from the sheet URL)
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
  
  // Child's name (used to form app title, e.g., "Hanu" -> "Hanuhlášky")
  KID_NAME: 'YourKid',
  
  // Emoji displayed with the title
  EMOJI: '⭐',
  
  // App timeouts (in milliseconds)
  TIMEOUT: 8000,
  REFRESH_DELAY: 1000,
  AUTO_HIDE_DELAY: 3000
};

// Derived values (computed from config)
APP_CONFIG.APP_TITLE = `${APP_CONFIG.KID_NAME}hlášky`;
APP_CONFIG.FULL_TITLE = `${APP_CONFIG.EMOJI} ${APP_CONFIG.APP_TITLE}`;
APP_CONFIG.GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.SHEET_ID}/edit`;

// Export for use in service worker
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.APP_CONFIG = APP_CONFIG;
}
