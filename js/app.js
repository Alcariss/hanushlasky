/**
 * Main application module for Quotes App
 * Coordinates between cache, API, and UI modules
 */

(function() {
  'use strict';
  
  // Wait for DOM and dependencies to be ready
  document.addEventListener('DOMContentLoaded', initApp);
  
  function initApp() {
    // Get references to modules (loaded before this script)
    const Cache = window.QuotesCache;
    const API = window.QuotesAPI;
    const UI = window.QuotesUI;
    
    // Configuration (uses values from config.js)
    const CONFIG = {
      SCRIPT_URL: APP_CONFIG.SCRIPT_URL,
      GOOGLE_SHEET_URL: APP_CONFIG.GOOGLE_SHEET_URL,
      TIMEOUT: APP_CONFIG.TIMEOUT,
      REFRESH_DELAY: APP_CONFIG.REFRESH_DELAY,
      AUTO_HIDE_DELAY: APP_CONFIG.AUTO_HIDE_DELAY
    };
    
    // DOM Elements
    const form = document.getElementById('quoteForm');
    const status = document.getElementById('status');
    const quotesContainer = document.getElementById('quotesContainer');
    const quoteDateInput = document.getElementById('quoteDate');
    
    // Set today's date as default
    quoteDateInput.value = UI.getTodayDate();
    
    // Set dynamic content from config
    document.getElementById('versionInfo').textContent = `v${window.APP_VERSION}`;
    document.title = APP_CONFIG.APP_TITLE;
    document.getElementById('appTitle').textContent = APP_CONFIG.FULL_TITLE;
    document.getElementById('metaDescription').content = `Sledování a ukládání nezapomenutelných citátů - ${APP_CONFIG.APP_TITLE}`;
    document.getElementById('appleTitle').content = APP_CONFIG.APP_TITLE;
    
    // Application state
    let currentQuotes = [];
    let editingQuoteIndex = -1;
    let deletingQuoteIndex = -1;
    let isSubmitting = false;
    let isFetching = false;
    
    // PWA state
    let serviceWorkerRegistration = null;
    let isUpdateAvailable = false;
    
    // Helper function to show status messages
    function showStatus(message, type) {
      UI.showStatus(status, message, type, CONFIG.AUTO_HIDE_DELAY);
    }
    
    // Helper function to reset form and refresh quotes
    function resetFormAndRefresh() {
      form.reset();
      quoteDateInput.value = UI.getTodayDate();
      setTimeout(() => safeFetchQuotes(), CONFIG.REFRESH_DELAY);
    }
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (isSubmitting) {
        console.log('Submission already in progress, ignoring');
        return;
      }
      
      const quote = document.getElementById('quote').value.trim();
      const selectedDate = quoteDateInput.value;
      
      if (!quote) return;
      if (!selectedDate) {
        showStatus("Prosím vyberte datum.", "error");
        return;
      }
      
      // Check for duplicate
      if (UI.isDuplicate(currentQuotes, quote, selectedDate)) {
        showStatus("Tento citát již existuje.", "error");
        return;
      }
      
      isSubmitting = true;
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Ukládání...';

      try {
        showStatus("Ukládání citátu...", "info");
        
        const url = new URL(CONFIG.SCRIPT_URL);
        url.searchParams.append('date', selectedDate);
        url.searchParams.append('quote', quote);
        
        console.log('Saving quote to:', url.toString());
        
        try {
          await API.saveWithFetch(url);
        } catch (fetchError) {
          console.warn('Fetch failed, trying image fallback:', fetchError);
          await API.saveWithImage(url);
        }
        
        // Optimistic cache update
        Cache.addQuoteToCache(quote, selectedDate);
        showStatus("Citát byl úspěšně uložen!", "success");
        resetFormAndRefresh();
        
      } catch (error) {
        console.error('All methods failed:', error);
        showStatus(`Chyba při připojení k serveru: ${error.message}`, "error");
      } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Uložit citát';
      }
    });

    // Fetch quotes function
    async function fetchQuotes() {
      if (isFetching) {
        console.log('Fetch already in progress, skipping');
        return;
      }
      
      isFetching = true;
      
      try {
        // Show cached quotes immediately (stale-while-revalidate)
        const cachedQuotes = Cache.getCachedQuotes();
        if (cachedQuotes && cachedQuotes.length > 0) {
          console.log('Displaying cached quotes while fetching fresh data');
          displayQuotes(cachedQuotes, true);
        } else {
          quotesContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Načítání citátů...</div>';
        }
        
        const url = new URL(CONFIG.SCRIPT_URL);
        url.searchParams.append('action', 'fetch');
        
        console.log('Fetching quotes from:', url.toString());
        
        const data = await API.fetchWithRetry(url, CONFIG.TIMEOUT);
        
        if (data) {
          if (data.success === false && data.error) {
            throw new Error(data.error);
          }
          Cache.setCachedQuotes(data);
          displayQuotes(data);
          return;
        }
        
        // All retries failed
        if (cachedQuotes && cachedQuotes.length > 0) {
          console.log('Using cached quotes after fetch failure');
          displayQuotes(cachedQuotes, false, true);
        } else {
          showFetchError('Nepodařilo se načíst citáty ze serveru.');
        }
        
      } catch (error) {
        console.error('Error fetching quotes:', error);
        const cachedQuotes = Cache.getCachedQuotes();
        if (cachedQuotes && cachedQuotes.length > 0) {
          displayQuotes(cachedQuotes, false, true);
        } else {
          showFetchError(`Chyba při načítání: ${error.message}`);
        }
      } finally {
        isFetching = false;
      }
    }
    
    // Safe fetch wrapper
    async function safeFetchQuotes() {
      try {
        await fetchQuotes();
      } catch (error) {
        console.error('Safe fetch quotes error:', error);
      }
    }
    
    // Display quotes in container
    function displayQuotes(quotes, showRefreshIndicator = false, isFromCache = false) {
      const uniqueQuotes = UI.deduplicateQuotes(quotes);
      currentQuotes = uniqueQuotes;
      
      if (!uniqueQuotes || uniqueQuotes.length === 0) {
        quotesContainer.innerHTML = '<div class="no-quotes">Nebyly nalezeny žádné citáty. Přidejte svůj první citát výše!</div>';
        return;
      }
      
      let statusBanner = '';
      if (showRefreshIndicator) {
        statusBanner = `
          <div class="status-banner status-banner-loading">
            <span class="spinner spinner-inline"></span>
            Aktualizuji citáty...
          </div>
        `;
      } else if (isFromCache) {
        const cacheAgeText = Cache.formatCacheAgeText(Cache.getCacheAge());
        statusBanner = `
          <div class="status-banner status-banner-cache">
            📦 Zobrazuji uložené citáty (${cacheAgeText}) &nbsp;
            <button onclick="window.AppActions.manualRetryFetch()">🔄 Obnovit</button>
          </div>
        `;
      }
      
      const quotesHTML = uniqueQuotes.map((quote, index) => `
        <div class="quote-item" data-index="${index}">
          <div class="quote-text">"${UI.escapeHtml(quote.text)}"</div>
          <div class="quote-date">${UI.formatDate(quote.date)}</div>
          <div class="quote-actions">
            <button class="btn-icon btn-share" onclick="window.AppActions.shareQuote(${index})" title="Sdílet citát" aria-label="Sdílet citát">
              📤
            </button>
            <button class="btn-icon btn-edit" onclick="window.AppActions.editQuote(${index})" title="Upravit citát" aria-label="Upravit citát">
              ✏️
            </button>
            <button class="btn-icon btn-delete" onclick="window.AppActions.deleteQuote(${index})" title="Smazat citát" aria-label="Smazat citát">
              🗑️
            </button>
          </div>
        </div>
      `).join('');
      
      quotesContainer.innerHTML = statusBanner + quotesHTML;
    }
    
    // Show fetch error with retry button
    function showFetchError(message) {
      const isOffline = !navigator.onLine;
      const offlineMessage = isOffline ? 
        '<p style="margin-bottom: 8px; color: #e53e3e;">📵 Nejste připojeni k internetu</p>' : '';
      
      quotesContainer.innerHTML = `
        <div class="error-message">
          ${offlineMessage}
          <p style="margin-bottom: 12px;">⚠️ ${message}</p>
          <button onclick="window.AppActions.manualRetryFetch()" class="btn btn-primary" style="max-width: 200px; margin: 0 auto 16px;" ${isOffline ? 'disabled' : ''}>
            🔄 Zkusit znovu
          </button>
          <p style="margin-top: 8px;"><a href="${CONFIG.GOOGLE_SHEET_URL}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
            📊 Zobrazit všechny citáty v Google Sheets →
          </a></p>
          <details class="error-details">
            <summary>Troubleshooting</summary>
            <div>
              <p><strong>Možné příčiny:</strong></p>
              <ul>
                <li>Pomalé nebo nestabilní připojení k internetu</li>
                <li>Google Apps Script může být dočasně nedostupný</li>
                <li>Server může být přetížený</li>
              </ul>
              <p style="margin-top: 8px;"><strong>Zkuste:</strong></p>
              <ul>
                <li>Počkat chvíli a zkusit znovu</li>
                <li>Zkontrolovat připojení k internetu</li>
                <li>Obnovit stránku</li>
              </ul>
            </div>
          </details>
        </div>
      `;
    }
    
    // Manual retry function
    async function manualRetryFetch() {
      quotesContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Načítání citátů...</div>';
      await safeFetchQuotes();
    }
    
    // Share quote
    async function shareQuote(index) {
      if (!currentQuotes[index]) return;
      
      const quote = currentQuotes[index];
      const shareText = `"${quote.text}" - ${APP_CONFIG.KID_NAME}, ${UI.formatDate(quote.date)}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: APP_CONFIG.APP_TITLE,
            text: shareText
          });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }
      
      try {
        await navigator.clipboard.writeText(shareText);
        UI.showToast('Citát zkopírován do schránky');
      } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        UI.showToast('Citát zkopírován do schránky');
      }
    }
    
    // Edit quote
    function editQuote(index) {
      if (!currentQuotes[index]) return;
      
      editingQuoteIndex = index;
      const quote = currentQuotes[index];
      
      document.getElementById('editQuote').value = quote.text;
      document.getElementById('editQuoteDate').value = UI.formatDateForInput(quote.date);
      document.getElementById('editModal').classList.add('show');
    }
    
    function closeEditModal() {
      document.getElementById('editModal').classList.remove('show');
      editingQuoteIndex = -1;
      document.getElementById('editStatus').className = 'status';
    }
    
    // Delete quote
    function deleteQuote(index) {
      if (!currentQuotes[index]) return;
      
      deletingQuoteIndex = index;
      const quote = currentQuotes[index];
      
      document.getElementById('deleteQuotePreview').innerHTML = `
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <div style="font-style: italic; margin-bottom: 4px;">"${UI.escapeHtml(quote.text)}"</div>
          <div style="font-size: 0.9rem; color: #718096;">${UI.formatDate(quote.date)}</div>
        </div>
      `;
      document.getElementById('deleteModal').classList.add('show');
    }
    
    function closeDeleteModal() {
      document.getElementById('deleteModal').classList.remove('show');
      deletingQuoteIndex = -1;
      document.getElementById('deleteStatus').className = 'status';
    }
    
    function confirmDelete() {
      if (deletingQuoteIndex === -1) return;
      performDeleteQuote(deletingQuoteIndex);
    }
    
    // Show modal status
    function showModalStatus(elementId, message, type) {
      const statusElement = document.getElementById(elementId);
      statusElement.textContent = message;
      statusElement.className = `status show ${type}`;
      
      if (type === 'success') {
        setTimeout(() => {
          statusElement.className = 'status';
        }, CONFIG.AUTO_HIDE_DELAY);
      }
    }
    
    // Perform edit
    async function performEditQuote(index, newText, newDate) {
      try {
        console.log('=== EDIT OPERATION START ===');
        showModalStatus('editStatus', 'Ukládání změn...', 'info');
        
        const url = new URL(CONFIG.SCRIPT_URL);
        url.searchParams.append('action', 'edit');
        url.searchParams.append('index', index.toString());
        url.searchParams.append('date', newDate);
        url.searchParams.append('quote', newText);
        
        try {
          await API.saveWithFetch(url);
        } catch (fetchError) {
          await API.saveWithImage(url);
        }
        
        showModalStatus('editStatus', 'Změny byly úspěšně uloženy!', 'success');
        Cache.invalidateCache();
        setTimeout(() => {
          closeEditModal();
          safeFetchQuotes();
        }, 1500);
        
      } catch (error) {
        console.error('Edit failed:', error);
        showModalStatus('editStatus', `Chyba při ukládání: ${error.message}`, 'error');
      }
    }
    
    // Perform delete
    async function performDeleteQuote(index) {
      try {
        console.log('Starting delete operation for index:', index);
        showModalStatus('deleteStatus', 'Mazání citátu...', 'info');
        
        const url = new URL(CONFIG.SCRIPT_URL);
        url.searchParams.append('action', 'delete');
        url.searchParams.append('index', index.toString());
        
        try {
          await API.saveWithFetch(url);
        } catch (fetchError) {
          await API.saveWithImage(url);
        }
        
        showModalStatus('deleteStatus', 'Citát byl úspěšně smazán!', 'success');
        Cache.invalidateCache();
        setTimeout(() => {
          closeDeleteModal();
          safeFetchQuotes();
        }, 1500);
        
      } catch (error) {
        console.error('Delete failed:', error);
        showModalStatus('deleteStatus', `Chyba při mazání: ${error.message}`, 'error');
      }
    }
    
    // Edit form submission
    document.getElementById('editQuoteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (editingQuoteIndex === -1) return;
      
      const newText = document.getElementById('editQuote').value.trim();
      const newDate = document.getElementById('editQuoteDate').value;
      
      if (!newText || !newDate) {
        showModalStatus('editStatus', 'Prosím vyplňte všechna pole.', 'error');
        return;
      }
      
      await performEditQuote(editingQuoteIndex, newText, newDate);
    });
    
    // Modal close handlers
    document.getElementById('editModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeEditModal();
    });
    
    document.getElementById('deleteModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeDeleteModal();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditModal();
        closeDeleteModal();
      }
    });
    
    // Network event listeners
    window.addEventListener('online', () => {
      console.log('Network connection restored, refreshing quotes...');
      UI.showToast('Připojení obnoveno');
      setTimeout(() => safeFetchQuotes(), 1000);
    });
    
    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      UI.showToast('Ztráta připojení k internetu');
    });
    
    // PWA update functionality
    const isIOSPWA = () => {
      return window.navigator.standalone === true ||
             window.matchMedia('(display-mode: standalone)').matches;
    };
    
    function checkForUpdates() {
      if (serviceWorkerRegistration) {
        console.log('Checking for updates...');
        serviceWorkerRegistration.update();
        
        if (isIOSPWA()) {
          setTimeout(() => {
            if (serviceWorkerRegistration.waiting) {
              console.log('Update found in waiting state');
              showUpdateAvailable();
            }
          }, 2000);
        }
      }
    }
    
    function showUpdateAvailable() {
      isUpdateAvailable = true;
      const versionElement = document.getElementById('versionInfo');
      if (versionElement) {
        versionElement.textContent = 'New version available';
        versionElement.style.background = '#ed8936';
        versionElement.style.color = 'white';
        versionElement.title = 'Click to update';
      }
    }
    
    function updateApp() {
      const versionElement = document.getElementById('versionInfo');
      if (versionElement) {
        versionElement.textContent = 'Aktualizace...';
        versionElement.classList.add('updating');
      }

      if ('caches' in window) {
        caches.keys().then(names => {
          Promise.all(names.map(name => caches.delete(name))).then(() => {
            window.location.reload(true);
          });
        });
      } else {
        window.location.reload(true);
      }
    }
    
    document.getElementById('versionInfo').addEventListener('click', () => {
      // On iOS or when already showing update, always force update
      // Otherwise check first, then force update if clicked again
      if (isUpdateAvailable || isIOSPWA()) {
        updateApp();
      } else {
        // Show checking state
        const versionElement = document.getElementById('versionInfo');
        const originalText = versionElement.textContent;
        versionElement.textContent = 'Kontrola...';
        
        checkForUpdates();
        
        // If no update found after 3 seconds, offer force refresh
        setTimeout(() => {
          if (!isUpdateAvailable) {
            versionElement.textContent = 'Klikněte znovu pro update';
            versionElement.style.background = '#4299e1';
            versionElement.style.color = 'white';
            isUpdateAvailable = true; // Allow force update on next click
          }
        }, 3000);
      }
    });
    
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(registration => {
          serviceWorkerRegistration = registration;
          console.log('Service Worker registered successfully');
          
          if (isIOSPWA()) {
            setTimeout(() => checkForUpdates(), 1000);
            setInterval(() => checkForUpdates(), 30000);
          }
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('New service worker found');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Update available');
                showUpdateAvailable();
              }
            });
          });
          
          if (isIOSPWA()) {
            document.addEventListener('visibilitychange', () => {
              if (!document.hidden) {
                setTimeout(() => checkForUpdates(), 1000);
              }
            });
          }
        })
        .catch(error => {
          console.log('Service Worker registration failed:', error);
        });
    }
    
    // Expose actions for onclick handlers
    window.AppActions = {
      shareQuote,
      editQuote,
      deleteQuote,
      closeEditModal,
      closeDeleteModal,
      confirmDelete,
      manualRetryFetch
    };
    
    // Initial fetch
    safeFetchQuotes();
    
    console.log('%c[App]%c Quotes app initialized', 
      'color: #667eea; font-weight: bold;', 
      'color: inherit;'
    );
  }
})();
