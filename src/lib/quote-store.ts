import type { Diagnostics, EditQuote, NewQuote, Quote } from '../types';

export type QuoteStoreApi = {
  fetchQuotes(): Promise<{ quotes: Quote[]; diagnostics: Diagnostics }>;
  createQuote(input: NewQuote): Promise<Quote>;
  editQuote(input: EditQuote): Promise<Quote>;
  deleteQuote(id: string): Promise<void>;
};

export type QuoteStoreCache = {
  loadCache(): { quotes: Quote[]; ageMs: number } | null;
  saveCache(quotes: Quote[]): void;
};

export type QuoteStoreResult = {
  quotes: Quote[];
  diagnostics: Diagnostics;
};

export type QuoteStore = {
  loadCached(): { quotes: Quote[]; ageMs: number } | null;
  refresh(): Promise<QuoteStoreResult>;
  create(input: NewQuote): Promise<QuoteStoreResult>;
  edit(input: EditQuote): Promise<QuoteStoreResult>;
  delete(id: string): Promise<QuoteStoreResult>;
};

export function createQuoteStore(deps: {
  api: QuoteStoreApi;
  cache: QuoteStoreCache;
}): QuoteStore {
  const { api, cache } = deps;

  function loadCached() {
    return cache.loadCache();
  }

  async function refresh(): Promise<QuoteStoreResult> {
    try {
      const result = await api.fetchQuotes();
      cache.saveCache(result.quotes);
      return result;
    } catch (error) {
      const cached = cache.loadCache();
      if (cached && cached.quotes.length > 0) {
        return {
          quotes: cached.quotes,
          diagnostics: {
            endpoint: '',
            source: 'cache',
            fetchedAt: new Date(Date.now() - cached.ageMs).toISOString(),
            cacheAgeSeconds: Math.floor(cached.ageMs / 1000),
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }
      throw error;
    }
  }

  async function create(input: NewQuote): Promise<QuoteStoreResult> {
    await api.createQuote(input);
    return refresh();
  }

  async function edit(input: EditQuote): Promise<QuoteStoreResult> {
    await api.editQuote(input);
    return refresh();
  }

  async function del(id: string): Promise<QuoteStoreResult> {
    await api.deleteQuote(id);
    return refresh();
  }

  return { loadCached, refresh, create, edit, delete: del };
}
