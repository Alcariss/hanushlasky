# Hlášky - Kids Quote Tracker

A simple PWA (Progressive Web App) for tracking and saving your child's memorable quotes. Works offline and can be installed on your phone's home screen.

## Features

- 📱 Works as a mobile app (PWA)
- 💾 Stores quotes in Google Sheets
- 🔄 Works offline
- ✏️ Edit and delete quotes
- 🔍 Duplicate detection
- 🎨 Customizable for any child

## Demo

The app displays quotes sorted by date (newest first) and allows you to add new quotes with a simple form.

## Setup Instructions

### Prerequisites

- A Google account
- A place to host static files (GitHub Pages, Netlify, Vercel, or any web server)

---

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it something like "Kid's Quotes"
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```
   The Sheet ID is the long string between `/d/` and `/edit`

---

### Step 2: Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `google-apps-script-updated.gs` from this repository
4. Paste it into the Apps Script editor
5. Click **Save** (💾 icon or Ctrl+S)
6. Click **Deploy → New deployment**
7. Configure the deployment:
   - Click the gear icon next to "Select type" and choose **Web app**
   - **Description**: "Quotes API v1" (or any description)
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
8. Click **Deploy**
9. Click **Authorize access** and follow the prompts
   - You may see "Google hasn't verified this app" - click **Advanced → Go to [project name] (unsafe)**
   - This is safe because you're authorizing your own script
10. Copy the **Web app URL** - you'll need this for the config

The URL looks like:
```
https://script.google.com/macros/s/AKfycby.../exec
```

---

### Step 3: Configure the App

Edit `config.js` with your values:

```javascript
const APP_CONFIG = {
  // Your Google Apps Script deployment URL from Step 2
  SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  
  // Your Google Sheet ID from Step 1
  SHEET_ID: 'YOUR_SHEET_ID',
  
  // Your child's name (forms the title, e.g., "Hanu" → "Hanuhlášky")
  KID_NAME: 'Hanu',
  
  // Emoji shown in the title
  EMOJI: '🍯',
  
  // Timeouts (usually no need to change)
  TIMEOUT: 8000,
  REFRESH_DELAY: 1000,
  AUTO_HIDE_DELAY: 3000
};
```

---

### Step 4: Deploy the Web App (GitHub Pages)

1. Fork this repository or create a new one
2. Edit `config.js` with your values from Steps 1 and 2
3. Commit and push your changes
4. Go to **Settings → Pages**
5. Under "Source", select **Deploy from a branch**
6. Choose **main** branch and **/ (root)** folder
7. Click **Save**
8. Your app will be available at `https://yourusername.github.io/repository-name/`

---

### Step 5: Install as Mobile App (Optional)

#### iOS (iPhone/iPad)
1. Open the app URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Name it and tap **Add**

#### Android
1. Open the app URL in Chrome
2. Tap the **three dots** menu
3. Tap **Add to Home screen** or **Install app**
4. Confirm the installation

---

## Customization

### Changing the Child's Name

Edit `config.js`:
```javascript
KID_NAME: 'Emma',  // Changes title to "Emmahlášky"
EMOJI: '🦋',       // Changes emoji
```

### Custom App Icons

Replace these files with your own icons (keep the same filenames):
- `icon-180.png` (180×180 pixels) - iOS home screen
- `icon-192.png` (192×192 pixels) - Android
- `icon-512.png` (512×512 pixels) - Android splash screen

---

## File Structure

```
├── index.html                    # Main app
├── config.js                     # ⚙️ Configuration (edit this!)
├── version.js                    # App version
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker (offline support)
├── google-apps-script-updated.gs # Google Apps Script code
├── tests.html                    # Browser tests
├── icon-180.png                  # iOS icon
├── icon-192.png                  # Android icon
└── icon-512.png                  # Large icon
```

---

## Troubleshooting

### Quotes not loading

1. Check browser console for errors (F12 → Console)
2. Verify your `SCRIPT_URL` in `config.js` is correct
3. Make sure the Google Apps Script is deployed with "Anyone" access
4. Try redeploying the Apps Script (Deploy → New deployment)

### "Google hasn't verified this app" warning

This is normal for personal Apps Scripts. Click **Advanced → Go to [project name]** to proceed.

### Changes not appearing

The app uses caching for offline support. To force refresh:
- **Browser**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- **iOS PWA**: Delete and re-add the app
- **Android PWA**: Clear app data in settings

### Duplicate quotes appearing

The app has built-in duplicate detection, but if duplicates exist in your sheet:
1. Open the Google Sheet directly
2. Delete duplicate rows manually

---

## Updating the App

When you make changes:

1. Update `version.js` with a new version number
2. Commit and push to GitHub (or re-upload files)
3. On mobile PWA: tap the version badge to update, or reinstall the app

---

## License

MIT License - Feel free to use and modify for your family!

---

## Credits

Built with ❤️ for parents who want to remember their kids' precious words.
