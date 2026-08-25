import './styles/main.css';
import { APP_CONFIG, UI_CONFIG } from './config';
import { fetchQuotes } from './lib/api';
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
      <p class="subtitle">Read-only MVP. Add/Edit/Delete will come in next slices.</p>
    </header>

    <section class="coming-soon">
      <button disabled aria-disabled="true">➕ Přidat (coming soon)</button>
      <button disabled aria-disabled="true">✏️ Upravit (coming soon)</button>
      <button disabled aria-disabled="true">🗑️ Smazat (coming soon)</button>
    </section>

    <section id="status"></section>
    <section id="quotes"></section>
    <section id="debug" class="debug"></section>
  </main>
`;

const statusNode = requiredNode<HTMLElement>('#status');
const quotesNode = requiredNode<HTMLElement>('#quotes');
const debugNode = requiredNode<HTMLElement>('#debug');

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

async function bootstrap(): Promise<void> {
  const cached = loadCache();
  if (cached && cached.quotes.length > 0) {
    renderQuotes(cached.quotes);
    setStatus(`Zobrazuji cache (${cacheAgeText(cached.ageMs)}), aktualizuji...`, 'info');
    renderDebug({
      endpoint: APP_CONFIG.apiUrlPrimary,
      source: 'cache',
      fetchedAt: new Date(Date.now() - cached.ageMs).toISOString(),
      cacheAgeSeconds: Math.floor(cached.ageMs / 1000),
      error: null
    });
  } else {
    setStatus('Načítám citáty...', 'info');
  }

  try {
    const { quotes, diagnostics } = await fetchQuotes();
    saveCache(quotes);
    renderQuotes(quotes);
    setStatus('Citáty načteny.', 'success');
    renderDebug(diagnostics);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (cached && cached.quotes.length > 0) {
      setStatus('Server není dostupný. Zobrazuji uložené citáty.', 'error');
      renderDebug({
        endpoint: APP_CONFIG.apiUrlPrimary,
        source: 'cache',
        fetchedAt: new Date().toISOString(),
        cacheAgeSeconds: Math.floor(cached.ageMs / 1000),
        error: message
      });
      return;
    }

    setStatus('Nepodařilo se načíst citáty. Obnov stránku nebo zkus později.', 'error');
    quotesNode.innerHTML = '<button id="retry" type="button">Zkusit znovu</button>';
    renderDebug({
      endpoint: APP_CONFIG.apiUrlPrimary,
      source: 'primary',
      fetchedAt: new Date().toISOString(),
      cacheAgeSeconds: null,
      error: message
    });

    const retry = document.querySelector<HTMLButtonElement>('#retry');
    retry?.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

bootstrap();
