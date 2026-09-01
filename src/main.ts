import './styles/main.css';
import { APP_CONFIG, UI_CONFIG } from './config';
import {
  createQuote,
  deleteQuote,
  editQuote,
  fetchQuotes
} from './lib/api';
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
      <h1>🍯 Hanuhlášky</h1>
    </header>

    <section id="add-form-section" class="add-form">
      <form id="add-form">
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

const addFormSection = requiredNode<HTMLElement>(
  '#add-form-section'
);
const addForm = requiredNode<HTMLFormElement>('#add-form');
const addText = requiredNode<HTMLTextAreaElement>('#add-text');
const addDate = requiredNode<HTMLInputElement>('#add-date');
const addSubmit = requiredNode<HTMLButtonElement>(
  '#add-submit'
);
const addError = requiredNode<HTMLElement>('#add-error');

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toISODate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return todayISO();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

addDate.value = todayISO();

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

    addText.value = '';
    addDate.value = todayISO();
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

let statusTimeout: ReturnType<typeof setTimeout> | null =
  null;

function setStatus(
  message: string,
  kind: 'info' | 'error' | 'success'
): void {
  if (statusTimeout) clearTimeout(statusTimeout);
  statusNode.className = `status ${kind}`;
  statusNode.textContent = message;

  if (kind === 'success') {
    statusTimeout = setTimeout(() => {
      statusNode.textContent = '';
      statusNode.className = '';
    }, 3000);
  }
}

function renderQuotes(quotes: Quote[]): void {
  if (quotes.length === 0) {
    quotesNode.innerHTML =
      '<p class="empty">Žádné citáty nenalezeny.</p>';
    return;
  }

  quotesNode.innerHTML = quotes
    .map(
      (quote) => `
      <article class="quote-card" data-id="${escapeHtml(quote.id)}">
        <div class="quote-view">
          <p class="quote-text">
            "${escapeHtml(quote.text)}"
          </p>
          <p class="quote-date">
            ${escapeHtml(formatDate(quote.date))}
          </p>
        </div>
        <div class="quote-edit hidden">
          <textarea class="edit-text" rows="3"
          >${escapeHtml(quote.text)}</textarea>
          <input type="date" class="edit-date"
            value="${toISODate(quote.date)}" />
          <div class="form-actions">
            <button type="button"
              class="btn-save">Uložit</button>
            <button type="button"
              class="btn-cancel">Zrušit</button>
            <button type="button"
              class="btn-delete">Smazat</button>
          </div>
          <p class="edit-error hidden"></p>
        </div>
      </article>
    `
    )
    .join('');

  quotesNode.querySelectorAll('.quote-view').forEach((el) => {
    el.addEventListener('click', handleCardClick);
  });

  quotesNode.querySelectorAll('.btn-cancel').forEach((btn) => {
    btn.addEventListener('click', handleCancelClick);
  });

  quotesNode.querySelectorAll('.btn-save').forEach((btn) => {
    btn.addEventListener('click', handleSaveClick);
  });

  quotesNode.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', handleDeleteClick);
  });
}

function handleCardClick(event: Event): void {
  const view = event.currentTarget as HTMLElement;
  const card = view.closest('.quote-card') as HTMLElement;
  view.classList.add('hidden');
  card.querySelector('.quote-edit')
    ?.classList.remove('hidden');
}

function handleCancelClick(event: Event): void {
  const btn = event.currentTarget as HTMLElement;
  const card = btn.closest('.quote-card') as HTMLElement;
  card.querySelector('.quote-view')
    ?.classList.remove('hidden');
  card.querySelector('.quote-edit')
    ?.classList.add('hidden');
  card.querySelector('.edit-error')
    ?.classList.add('hidden');
}

async function handleSaveClick(
  event: Event
): Promise<void> {
  const btn = event.currentTarget as HTMLButtonElement;
  const card = btn.closest('.quote-card') as HTMLElement;
  const id = card.dataset.id ?? '';
  const textarea = card.querySelector(
    '.edit-text'
  ) as HTMLTextAreaElement;
  const dateInput = card.querySelector(
    '.edit-date'
  ) as HTMLInputElement;
  const errorEl = card.querySelector(
    '.edit-error'
  ) as HTMLElement;

  const text = textarea.value.trim();
  const date = dateInput.value;

  if (!text || !date) {
    errorEl.textContent = 'Vyplň text i datum.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Ukládám...';
  errorEl.classList.add('hidden');

  try {
    await editQuote({ id, text, date });
    await refreshQuotes();
  } catch (error) {
    const msg = error instanceof Error
      ? error.message
      : String(error);
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Uložit';
  }
}

async function handleDeleteClick(
  event: Event
): Promise<void> {
  const btn = event.currentTarget as HTMLButtonElement;
  const card = btn.closest('.quote-card') as HTMLElement;
  const id = card.dataset.id ?? '';

  if (!confirm('Opravdu smazat tento citát?')) {
    return;
  }

  btn.disabled = true;

  try {
    await deleteQuote(id);
    await refreshQuotes();
  } catch (error) {
    const msg = error instanceof Error
      ? error.message
      : String(error);
    alert(msg);
    btn.disabled = false;
  }
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
