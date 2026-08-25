import './styles/main.css';
import { APP_CONFIG, UI_CONFIG } from './config';
import { createQuote, fetchQuotes } from './lib/api';
import { loadCache, saveCache } from './lib/cache';
import { cacheAgeText, escapeHtml, formatDate } from './lib/format';
import type { Diagnostics, Quote } from './types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App mount node not found');
}

function requiredNode<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Required node not found: ${selector}`);
  }

  return node;
}

app.innerHTML = `
  <main class="container">
    <header class="header">
      <h1>${escapeHtml(UI_CONFIG.appName)}</h1>
      <p class="subtitle">
        Sledování a ukládání nezapomenutelných citátů
      </p>
    </header>

    <section class="actions">
      <button id="toggle-add" type="button">
        ➕ Přidat
      </button>
      <button disabled aria-disabled="true">
        ✏️ Upravit (coming soon)
      </button>
      <button disabled aria-disabled="true">
        🗑️ Smazat (coming soon)
      </button>
    </section>

    <section id="add-form-section" class="add-form hidden">
      <form id="add-form">
        <label for="add-text">Citát</label>
        <textarea
          id="add-text"
          rows="3"
          required
          placeholder="Zadej citát..."
        ></textarea>
        <label for="add-date">Datum</label>
        <input
          id="add-date"
          type="date"
          required
        />
        <div class="form-actions">
          <button type="submit" id="add-submit">
            Uložit
          </button>
          <button type="button" id="add-cancel">
            Zrušit
          </button>
        </div>
        <p id="add-error" class="form-error hidden"></p>
      </form>
    </section>

    <section id="status"></section>
    <section id="quotes"></section>
    <section id="debug" class="debug"></section>
  </main>
`;

const statusNode = requiredNode<HTMLElement>('#status');
const quotesNode = requiredNode<HTMLElement>('#quotes');
const debugNode = requiredNode<HTMLElement>('#debug');

const toggleAddBtn = requiredNode<HTMLButtonElement>(
  '#toggle-add'
);
const addFormSection = requiredNode<HTMLElement>(
  '#add-form-section'
);
const addForm = requiredNode<HTMLFormElement>('#add-form');
const addText = requiredNode<HTMLTextAreaElement>('#add-text');
const addDate = requiredNode<HTMLInputElement>('#add-date');
const addSubmit = requiredNode<HTMLButtonElement>(
  '#add-submit'
);
const addCancel = requiredNode<HTMLButtonElement>(
  '#add-cancel'
);
const addError = requiredNode<HTMLElement>('#add-error');

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

toggleAddBtn.addEventListener('click', () => {
  const isHidden = addFormSection.classList.toggle('hidden');
  if (!isHidden) {
    addDate.value = addDate.value || todayISO();
    addText.focus();
  }
});

addCancel.addEventListener('click', () => {
  addFormSection.classList.add('hidden');
  addForm.reset();
  addError.classList.add('hidden');
});

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  addError.classList.add('hidden');
  addSubmit.disabled = true;
  addSubmit.textContent = 'Ukládám...';

  try {
    await createQuote({
      text: addText.value.trim(),
      date: addDate.value
    });

    addForm.reset();
    addFormSection.classList.add('hidden');
    await refreshQuotes();
  } catch (error) {
    const msg = error instanceof Error
      ? error.message
      : String(error);
    addError.textContent = msg;
    addError.classList.remove('hidden');
  } finally {
    addSubmit.disabled = false;
    addSubmit.textContent = 'Uložit';
  }
});

function setStatus(message: string, kind: 'info' | 'error' | 'success'): void {
  statusNode.className = `status ${kind}`;
  statusNode.textContent = message;
}

function renderQuotes(quotes: Quote[]): void {
  if (quotes.length === 0) {
    quotesNode.innerHTML = '<p class="empty">Žádné citáty nenalezeny.</p>';
    return;
  }

  quotesNode.innerHTML = quotes
    .map(
      (quote) => `
      <article class="quote-card">
        <p class="quote-text">"${escapeHtml(quote.text)}"</p>
        <p class="quote-date">${escapeHtml(formatDate(quote.date))}</p>
      </article>
    `
    )
    .join('');
}

function renderDebug(diagnostics: Diagnostics): void {
  if (!UI_CONFIG.showDebug) {
    debugNode.innerHTML = '';
    return;
  }

  debugNode.innerHTML = `
    <h2>Debug</h2>
    <dl>
      <dt>Endpoint</dt><dd>${escapeHtml(diagnostics.endpoint)}</dd>
      <dt>Source</dt><dd>${escapeHtml(diagnostics.source)}</dd>
      <dt>Fetched</dt><dd>${escapeHtml(diagnostics.fetchedAt)}</dd>
      <dt>Cache age</dt><dd>${diagnostics.cacheAgeSeconds ?? 'n/a'}</dd>
      <dt>Error</dt><dd>${escapeHtml(diagnostics.error ?? 'none')}</dd>
      <dt>Cache TTL</dt><dd>${Math.floor(APP_CONFIG.cacheTtlMs / 1000)} sec</dd>
    </dl>
  `;
}

async function refreshQuotes(): Promise<void> {
  try {
    const { quotes, diagnostics } = await fetchQuotes();
    saveCache(quotes);
    renderQuotes(quotes);
    setStatus('Citáty načteny.', 'success');
    renderDebug(diagnostics);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    const cached = loadCache();
    if (cached && cached.quotes.length > 0) {
      setStatus(
        'Server není dostupný. Zobrazuji uložené citáty.',
        'error'
      );
      renderDebug({
        endpoint: APP_CONFIG.apiUrlPrimary,
        source: 'cache',
        fetchedAt: new Date().toISOString(),
        cacheAgeSeconds: Math.floor(cached.ageMs / 1000),
        error: message
      });
      return;
    }

    setStatus(
      'Nepodařilo se načíst citáty. '
        + 'Obnov stránku nebo zkus později.',
      'error'
    );
    quotesNode.innerHTML = `
      <button id="retry" type="button">
        Zkusit znovu
      </button>
    `;
    renderDebug({
      endpoint: APP_CONFIG.apiUrlPrimary,
      source: 'primary',
      fetchedAt: new Date().toISOString(),
      cacheAgeSeconds: null,
      error: message
    });

    const retry = document.querySelector<HTMLButtonElement>(
      '#retry'
    );
    retry?.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

async function bootstrap(): Promise<void> {
  const cached = loadCache();
  if (cached && cached.quotes.length > 0) {
    renderQuotes(cached.quotes);
    setStatus(
      `Zobrazuji cache (${cacheAgeText(cached.ageMs)}), `
        + 'aktualizuji...',
      'info'
    );
    renderDebug({
      endpoint: APP_CONFIG.apiUrlPrimary,
      source: 'cache',
      fetchedAt: new Date(
        Date.now() - cached.ageMs
      ).toISOString(),
      cacheAgeSeconds: Math.floor(cached.ageMs / 1000),
      error: null
    });
  } else {
    setStatus('Načítám citáty...', 'info');
  }

  await refreshQuotes();
}

function setupUpdatePrompt(): void {
  const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

  let registration: ServiceWorkerRegistration | null = null;

  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((reg) => {
    registration = reg;
  });

  setInterval(() => {
    registration?.update();
  }, UPDATE_CHECK_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration?.update();
    }
  });

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      window.location.reload();
    }
  );

  let updateBanner: HTMLElement | null = null;

  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;

    const showPrompt = () => {
      if (updateBanner) return;
      updateBanner = document.createElement('div');
      updateBanner.className = 'update-banner';
      updateBanner.innerHTML = `
        <span>Nová verze je k dispozici.</span>
        <button id="update-btn" type="button">
          Aktualizovat
        </button>
      `;
      document.body.prepend(updateBanner);

      document.getElementById('update-btn')
        ?.addEventListener('click', () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        });
    };

    if (reg.waiting) {
      showPrompt();
    }

    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW?.addEventListener('statechange', () => {
        if (
          newSW.state === 'installed'
          && navigator.serviceWorker.controller
        ) {
          showPrompt();
        }
      });
    });
  });
}

setupUpdatePrompt();

bootstrap();
