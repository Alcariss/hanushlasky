// App Configuration
// Edit these values to customize the app for your child

const APP_CONFIG = {
  // Google Apps Script deployment URL
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyJHVEa_a6gW0GltRVkkfDyG6SugziO2k9Xvt0QoRCrs4cLZ3bNsDfWnmgG--3kMDK30g/exec',
  
  // Google Sheet ID (from the sheet URL)
  SHEET_ID: '1eXW41Uvwm8TqIGFhhHPSbNhQpObnEwM0PwV707dYU-A',
  
  // Child's name (used to form app title, e.g., "Hanu" -> "Hanuhlášky")
  KID_NAME: 'Hanu',
  
  // Emoji displayed with the title
  EMOJI: '🍯',
  
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
