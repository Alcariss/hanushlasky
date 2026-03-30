// App Configuration
// Edit these values to customize the app for your child

const APP_CONFIG = {
  // Google Apps Script deployment URL
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxSIik3BFls2U9Lsce3HJr6NpmXD7RHONjdNBrKKQB73ApzK-JTSq_22-SXnSg9bPHQbg/exec',
  
  // Google Sheet ID (from the sheet URL)
  SHEET_ID: '1eXW41Uvwm8TqIGFhhHPSbNhQpObnEwM0PwV707dYU-A',
  
  // Child's name (used to form app title, e.g., "Hanu" -> "Hanuhlášky")
  KID_NAME: 'Hanu',
  
  // Emoji displayed with the title
  EMOJI: '🍯',
  
  // App timeouts (in milliseconds)
  TIMEOUT: 12000,
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

// Export to window for browser access
if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
}
