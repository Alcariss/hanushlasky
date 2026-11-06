import '@alcariss/pwa-kit/styles.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { createIcons, Share } from 'lucide';
import {
  ApiError,
  AUTH_ERROR_CODES,
  createApiClient,
  createAuth,
  createCache,
  createPushNotifications,
  createResource,
  createStore,
  escapeHtml,
  formatAge,
  formatIsoDate,
  isDebugEnabled,
  mountPushToggle,
  readApiConfig,
  renderDiagnostics,
  renderLoginScreen,
  requiredElement,
  setupInstallHint,
  setupUpdatePrompt,
  toIsoDate,
  type Diagnostics,
  type InstallHint,
  type PushToggle
} from '@alcariss/pwa-kit';
import { shareText, toQuote, toQuoteParams, type Quote, type QuoteInput } from './quotes';
import { AUTH_MESSAGES, INSTALL_HINT_STRINGS, LOGIN_LABELS, PUSH_TOGGLE_STRINGS, SESSION_EXPIRED } from './texts';

const APP_TITLE = '🍯 Hanuhlášky';
const SHARE_TITLE = 'Hanuhlášky';
const LOCALE = 'cs-CZ';
const INSTALL_HINT_KEY = 'hlasky:install-hint-dismissed';

const config = readApiConfig(import.meta.env);
const auth = createAuth({ apiUrl: config.primaryUrl });
const client = createApiClient(config, { getSessionToken: () => auth.current()?.token ?? null });
const store = createStore<Quote, QuoteInput>({
  resource: createResource(client, { mapRow: toQuote, toParams: toQuoteParams }),
  cache: createCache<Quote>('hlasky:v2:quotes')
});
const root = requiredElement('#app');
const signInRequired = config.authProviders.length > 0;

setupUpdatePrompt(registerSW, { message: 'Nová verze je k dispozici.', buttonLabel: 'Aktualizovat' });
// Also clears the app icon badge whenever the app comes to the front.
const push = createPushNotifications(client);

let installHint: InstallHint | null = null;
let pushToggle: PushToggle | null = null;

/** Shown before sign-in too: an app installed on iOS has its own storage and starts signed out. */
function showInstallHint(target: HTMLElement): void {
  installHint?.dispose();
  installHint = setupInstallHint(target, {
    storageKey: INSTALL_HINT_KEY,
    signInRequired,
    strings: INSTALL_HINT_STRINGS
  });
}

function isInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * In Safari on iPhone push only works in the Home Screen app, so the install
 * hint above stands in for the switch. Once the hint is dismissed, the switch
 * area says the same in one line instead.
 */
function showPushToggle(target: HTMLElement): void {
  pushToggle?.dispose();
  pushToggle = mountPushToggle(target, push, {
    strings: { ...PUSH_TOGGLE_STRINGS, needsInstall: isInstallHintDismissed() ? PUSH_TOGGLE_STRINGS.needsInstall : '' }
  });
}

/** Signed-out devices should stop getting the family's quotes. */
async function signOut(): Promise<void> {
  await push.disable().catch((error: unknown) => console.warn('Could not turn off notifications', error));
  auth.logout();
}

function showLogin(message: string | null = null): void {
  store.clear();
  pushToggle?.dispose();
  pushToggle = null;
  renderLoginScreen(root, {
    title: APP_TITLE,
    providers: config.authProviders,
    message,
    labels: LOGIN_LABELS,
    onSelect: (provider) => auth.login(provider)
  });
  // Above the sign-in buttons: on iPhone, installing first saves signing in twice.
  const hintSlot = document.createElement('div');
  requiredElement('.pk-login h1', root).after(hintSlot);
  showInstallHint(hintSlot);
}

function formatDate(date: string): string {
  return formatIsoDate(date, LOCALE);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Sends the user back to sign-in when the session expired or was revoked. */
function handleAuthError(error: unknown): boolean {
  if (error instanceof ApiError && AUTH_ERROR_CODES.includes(error.code)) {
    // The worker rejects the unsubscribe call too, but the device still drops its subscription.
    void signOut();
    showLogin(error.code === 'FORBIDDEN' ? AUTH_MESSAGES.not_allowed : SESSION_EXPIRED);
    return true;
  }
  return false;
}

function showApp(): void {
  root.innerHTML = `
    <main class="container">
      <header class="header">
        <p class="build-version">v${escapeHtml(__APP_VERSION__)}</p>
        <h1>${escapeHtml(APP_TITLE)}</h1>
      </header>

      <div id="install-hint"></div>
      <div id="push"></div>

      <section class="add-form">
        <form id="add-form">
          <textarea id="add-text" rows="3" required placeholder="Zadej citát..."></textarea>
          <label for="add-date">Datum</label>
          <input id="add-date" type="date" required />
          <div class="form-actions">
            <button type="submit" id="add-submit">Uložit</button>
          </div>
          <p id="add-error" class="form-error hidden"></p>
        </form>
      </section>

      <section id="status" role="status"></section>
      <section id="quotes"></section>
      <section id="debug"></section>
      ${signInRequired ? '<p class="logout"><button id="logout" type="button">Odhlásit se</button></p>' : ''}
    </main>
  `;
  showInstallHint(requiredElement('#install-hint'));
  showPushToggle(requiredElement('#push'));

  const addForm = requiredElement<HTMLFormElement>('#add-form');
  const addText = requiredElement<HTMLTextAreaElement>('#add-text');
  const addDate = requiredElement<HTMLInputElement>('#add-date');
  const addSubmit = requiredElement<HTMLButtonElement>('#add-submit');
  const addError = requiredElement('#add-error');
  addDate.value = toIsoDate();

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    addError.classList.add('hidden');
    addSubmit.disabled = true;
    addSubmit.textContent = 'Ukládám...';

    try {
      const result = await store.create({ text: addText.value, date: addDate.value });
      addText.value = '';
      addDate.value = toIsoDate();
      renderQuotes(result);
      setStatus('Citát uložen.', 'success');
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addError.textContent = errorMessage(error);
      addError.classList.remove('hidden');
    } finally {
      addSubmit.disabled = false;
      addSubmit.textContent = 'Uložit';
    }
  });

  requiredElement('#quotes').addEventListener('click', (event) => void onQuoteClick(event));

  document.querySelector('#logout')?.addEventListener('click', async () => {
    await signOut();
    showLogin();
  });
}

let statusTimeout: ReturnType<typeof setTimeout> | null = null;

function setStatus(message: string, kind: 'info' | 'error' | 'success'): void {
  const statusNode = document.querySelector<HTMLElement>('#status');
  if (!statusNode) {
    return;
  }
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  statusNode.className = `status ${kind}`;
  statusNode.textContent = message;

  if (kind === 'success') {
    statusTimeout = setTimeout(() => {
      statusNode.textContent = '';
      statusNode.className = '';
    }, 3000);
  }
}

function renderQuotes(result: { items: Quote[]; diagnostics?: Diagnostics }): void {
  const quotesNode = requiredElement('#quotes');
  quotesNode.innerHTML = result.items.length === 0
    ? '<p class="empty">Žádné citáty nenalezeny.</p>'
    : result.items.map((quote) => `
      <article class="quote-card" data-id="${escapeHtml(quote.id)}">
        <div class="quote-view">
          <p class="quote-text">"${escapeHtml(quote.text)}"</p>
          <div class="quote-meta">
            <p class="quote-date">${escapeHtml(formatDate(quote.date))}</p>
            <button type="button" class="btn-share"
              aria-label="Sdílet citát" title="Sdílet citát"
              data-text="${escapeHtml(quote.text)}"
              data-date="${escapeHtml(formatDate(quote.date))}">
              <i data-lucide="share" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="quote-edit hidden">
          <textarea class="edit-text" rows="3">${escapeHtml(quote.text)}</textarea>
          <input type="date" class="edit-date" value="${escapeHtml(quote.date)}" />
          <div class="form-actions">
            <button type="button" class="btn-save">Uložit</button>
            <button type="button" class="btn-cancel">Zrušit</button>
            <button type="button" class="btn-delete">Smazat</button>
          </div>
          <p class="edit-error hidden"></p>
        </div>
      </article>
    `).join('');

  createIcons({ icons: { Share } });
  renderDebug(result.diagnostics);
}

function renderDebug(diagnostics: Diagnostics | undefined): void {
  if (isDebugEnabled() && diagnostics) {
    renderDiagnostics(requiredElement('#debug'), diagnostics, { Verze: __APP_VERSION__ });
  }
}

async function onQuoteClick(event: Event): Promise<void> {
  const target = event.target as Element;
  const card = target.closest<HTMLElement>('.quote-card');
  if (!card) {
    return;
  }

  const share = target.closest<HTMLButtonElement>('.btn-share');
  if (share) {
    await shareQuote(share.dataset.text ?? '', share.dataset.date ?? '');
    return;
  }

  if (target.closest('.quote-view')) {
    toggleEdit(card, true);
    return;
  }

  const button = target.closest<HTMLButtonElement>('button');
  if (button?.classList.contains('btn-cancel')) {
    toggleEdit(card, false);
  } else if (button?.classList.contains('btn-save')) {
    await saveQuote(card, button);
  } else if (button?.classList.contains('btn-delete')) {
    await deleteQuote(card, button);
  }
}

function toggleEdit(card: HTMLElement, editing: boolean): void {
  requiredElement('.quote-view', card).classList.toggle('hidden', editing);
  requiredElement('.quote-edit', card).classList.toggle('hidden', !editing);
  if (!editing) {
    requiredElement('.edit-error', card).classList.add('hidden');
  }
}

async function shareQuote(text: string, date: string): Promise<void> {
  if (!navigator.share) {
    setStatus('Sdílení tento prohlížeč nepodporuje.', 'error');
    return;
  }

  try {
    await navigator.share({ title: SHARE_TITLE, text: shareText(text, date) });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    setStatus('Citát se nepodařilo sdílet.', 'error');
  }
}

async function saveQuote(card: HTMLElement, button: HTMLButtonElement): Promise<void> {
  const id = card.dataset.id ?? '';
  const text = requiredElement<HTMLTextAreaElement>('.edit-text', card).value.trim();
  const date = requiredElement<HTMLInputElement>('.edit-date', card).value;
  const errorEl = requiredElement('.edit-error', card);

  if (!text || !date) {
    errorEl.textContent = 'Vyplň text i datum.';
    errorEl.classList.remove('hidden');
    return;
  }

  button.disabled = true;
  button.textContent = 'Ukládám...';
  errorEl.classList.add('hidden');

  try {
    renderQuotes(await store.update(id, { text, date }));
    setStatus('Citát upraven.', 'success');
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }
    errorEl.textContent = errorMessage(error);
    errorEl.classList.remove('hidden');
    button.disabled = false;
    button.textContent = 'Uložit';
  }
}

async function deleteQuote(card: HTMLElement, button: HTMLButtonElement): Promise<void> {
  if (!confirm('Opravdu smazat tento citát?')) {
    return;
  }

  button.disabled = true;

  try {
    renderQuotes(await store.remove(card.dataset.id ?? ''));
    setStatus('Citát smazán.', 'success');
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }
    alert(errorMessage(error));
    button.disabled = false;
  }
}

async function refreshQuotes(): Promise<void> {
  try {
    const result = await store.refresh();
    renderQuotes(result);
    if (result.diagnostics.source === 'cache') {
      setStatus('Server není dostupný. Zobrazuji uložené citáty.', 'error');
    } else {
      setStatus('Citáty načteny.', 'success');
    }
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }
    console.error(error);
    setStatus('Nepodařilo se načíst citáty. Obnov stránku nebo zkus později.', 'error');
    requiredElement('#quotes').innerHTML = '<button id="retry" type="button">Zkusit znovu</button>';
    requiredElement('#retry').addEventListener('click', () => window.location.reload());
  }
}

async function start(): Promise<void> {
  const outcome = auth.completeLogin();
  if (outcome.status === 'failed') {
    showLogin(AUTH_MESSAGES[outcome.reason] ?? AUTH_MESSAGES.provider_error);
    return;
  }
  if (signInRequired && auth.current() === null) {
    showLogin();
    return;
  }

  showApp();
  const cached = store.loadCached();
  if (cached && cached.items.length > 0) {
    renderQuotes(cached);
    setStatus(`Zobrazuji uložené citáty (${formatAge(cached.ageMs, LOCALE)}), aktualizuji...`, 'info');
  } else {
    setStatus('Načítám citáty...', 'info');
  }

  await refreshQuotes();
}

void start();
