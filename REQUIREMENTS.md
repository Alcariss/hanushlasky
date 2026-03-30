# Hanuhlášky Requirements

Requirements documented in WHAT/TRIGGER/CONSTRAINTS format for AI agent implementation.

---

## Quote Management

### Add Quote
```
WANT: Save a new quote with date to Google Sheets
TRIGGER: User submits the quote form
CONSTRAINTS: 
- Prevent duplicate quotes (same text + date)
- Show success message after save
- Clear form after successful submission
- Send email notification to configured recipients
- Don't block save if email fails
```

### Edit Quote
```
WANT: Modify existing quote text and/or date
TRIGGER: User clicks edit button on a quote, makes changes, clicks save
CONSTRAINTS:
- Show quote in modal with current values pre-filled
- Update correct row in sheet (handle sorted display vs actual row)
- Refresh quote list after edit
- Clear cache to ensure fresh data
```

### Delete Quote
```
WANT: Remove a quote permanently
TRIGGER: User clicks delete button, confirms in modal
CONSTRAINTS:
- Show quote preview in confirmation dialog
- Delete by matching content (not row index) for reliability
- Refresh quote list after deletion
- Clear cache to ensure fresh data
```

### Share Quote
```
WANT: Share quote text via native share or clipboard
TRIGGER: User clicks share button on a quote
CONSTRAINTS:
- Try native Web Share API first
- Fall back to clipboard copy if not available
- Show toast notification confirming action
```

---

## Display & UI

### Quote List Display
```
WANT: Show all quotes as scrollable cards
TRIGGER: App loads or data refreshes
CONSTRAINTS:
- Sort by date descending (newest first)
- Within same date, show most recently added first
- Each quote shows: text, date, action buttons (share/edit/delete)
- Cards have hover effects and animations
```

### Loading State
```
WANT: Show spinner while fetching data
TRIGGER: During API calls
CONSTRAINTS:
- Display centered spinner with "Načítání citátů..." text
- Replace with content when ready
```

### Empty State
```
WANT: Show friendly message when no quotes exist
TRIGGER: Quote list is empty after fetch
CONSTRAINTS:
- Display "Žádné citáty nenalezeny" message
```

### Error State
```
WANT: Show helpful error message with troubleshooting
TRIGGER: API call fails
CONSTRAINTS:
- Show error details expandable section
- Show offline indicator (📵) if network unavailable
- Provide direct link to Google Sheet as fallback
- Show retry button (disabled when offline)
```

---

## Caching & Offline

### Local Cache
```
WANT: Cache quotes in localStorage for instant display
TRIGGER: After successful fetch from server
CONSTRAINTS:
- 5-minute cache expiration
- Show cached data immediately on app load
- Display cache age indicator
```

### Stale-While-Revalidate
```
WANT: Show cached data while refreshing in background
TRIGGER: Cache exists but may be stale
CONSTRAINTS:
- Display cached quotes immediately
- Fetch fresh data in background
- Update display when fresh data arrives
- Show "Showing cached data" banner with refresh button
```

### Optimistic Updates
```
WANT: Show new quote in list immediately before server confirms
TRIGGER: User submits new quote
CONSTRAINTS:
- Add quote to local cache instantly
- Fetch fresh data after delay to confirm
```

### Cache Invalidation
```
WANT: Clear cache after data-modifying operations
TRIGGER: After successful edit or delete
CONSTRAINTS:
- Force fresh fetch on next load
```

---

## PWA Features

### Offline Support
```
WANT: App works without internet connection
TRIGGER: Device goes offline
CONSTRAINTS:
- Service worker caches all app assets
- Show cached quotes when offline
- Display offline indicator
- Queue operations for later (if possible)
```

### App Installation
```
WANT: App installable on home screen
TRIGGER: User opens in browser
CONSTRAINTS:
- Manifest configured for standalone mode
- Apple touch icons provided
- Proper theme color set
```

### Version Update
```
WANT: Update app when new version available
TRIGGER: User clicks version badge OR update detected by service worker
CONSTRAINTS:
- On iOS: single click clears cache and reloads
- On other platforms: first click checks, second click updates
- Show visual indicator when update available (orange background)
- Display "Aktualizace..." during update process
```

---

## Email Notifications (Google Apps Script)

### New Quote Notification
```
WANT: Email sent when quote is added
TRIGGER: After quote successfully saved to sheet
CONSTRAINTS:
- Send to comma-separated list of recipients
- Subject: "🍯 Hanuhlášky - New Quote Added"
- Body: date and quote text
- Don't fail the save operation if email fails
- Configurable enable/disable flag
```

---

## API Communication

### Fetch Quotes
```
WANT: Retrieve all quotes from Google Sheets
TRIGGER: App loads, manual refresh, or after modifications
CONSTRAINTS:
- Use JSONP for cross-origin compatibility
- 12 second timeout (configurable)
- Return sorted array of {date, text} objects
```

### Save Quote
```
WANT: Send new quote to Google Sheets
TRIGGER: Form submission
CONSTRAINTS:
- Try fetch API first
- Fall back to image beacon if CORS fails
- Include date and quote text parameters
```

### Retry Logic
```
WANT: Automatically retry failed requests
TRIGGER: Request fails
CONSTRAINTS:
- Up to 3 retries
- Exponential backoff: 1s, 2s, 4s delays
- Stop retrying if offline
```

---

## Form Handling

### Date Default
```
WANT: Pre-fill date input with today's date
TRIGGER: Form loads
CONSTRAINTS:
- Format: YYYY-MM-DD
```

### Form Validation
```
WANT: Prevent empty submissions
TRIGGER: User clicks submit
CONSTRAINTS:
- Both date and quote text required
- HTML5 validation + JS check
```

### Submit Button State
```
WANT: Show loading state during submission
TRIGGER: Form submit starts
CONSTRAINTS:
- Button shows "Saving..." or spinner
- Button disabled during operation
- Re-enable on completion or error
```

---

## Error Handling

### Global Error Handler
```
WANT: Catch and log all uncaught errors
TRIGGER: Any unhandled exception or promise rejection
CONSTRAINTS:
- Log to console with timestamp
- Store last 10 errors in memory
- Include URL, user agent, stack trace
```

### Network Errors
```
WANT: Handle offline/network failures gracefully
TRIGGER: Network request fails
CONSTRAINTS:
- Show offline-specific messaging
- Disable retry when offline
- Auto-refresh when connection restored
```

---

## Configuration

### Configurable Values
```
WANT: Easy customization without code changes
TRIGGER: Developer edits config.js
CONSTRAINTS:
- SCRIPT_URL: Google Apps Script deployment URL
- SHEET_ID: Google Sheet ID
- KID_NAME: Child's name for app title
- EMOJI: Title emoji
- TIMEOUT: Request timeout in ms
- REFRESH_DELAY: Delay before auto-refresh
- AUTO_HIDE_DELAY: Status message duration
```

### Backend Configuration
```
WANT: Configure email and sheet access
TRIGGER: Developer edits google-apps-script-updated.gs
CONSTRAINTS:
- EMAIL_RECIPIENTS: Comma-separated email list
- EMAIL_ENABLED: true/false toggle
- SHEET_ID: Target spreadsheet ID
```

---

## Accessibility

### Keyboard Navigation
```
WANT: Full keyboard accessibility
TRIGGER: User navigates with keyboard
CONSTRAINTS:
- ESC closes modals
- Tab navigates through interactive elements
- Enter submits forms
```

### Screen Reader Support
```
WANT: Proper screen reader experience
TRIGGER: Screen reader active
CONSTRAINTS:
- ARIA labels on buttons
- Semantic HTML structure
- Meaningful alt text
```

---

*Last updated: 2026-03-30 | Version: 1.8.1*
