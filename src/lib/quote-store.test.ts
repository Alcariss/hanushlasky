import { describe, expect, it } from 'vitest';
import { createQuoteStore } from './quote-store';
import type { QuoteStoreApi, QuoteStoreCache } from './quote-store';
import type { Diagnostics, Quote } from '../types';

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    date: '2026-08-25',
    text: 'Test quote',
    createdAt: '2026-08-25T06:00:00Z',
    updatedAt: '2026-08-25T06:00:00Z',
    ...overrides
  };
}

function makeDiagnostics(overrides: Partial<Diagnostics> = {}): Diagnostics {
  return {
    endpoint: 'https://example.com/api',
    source: 'primary',
    fetchedAt: '2026-08-25T10:00:00Z',
    cacheAgeSeconds: null,
    error: null,
    ...overrides
  };
}

function fakeApi(overrides: Partial<QuoteStoreApi> = {}): QuoteStoreApi {
  const quotes = [makeQuote()];
  return {
    fetchQuotes: async () => ({ quotes, diagnostics: makeDiagnostics() }),
    createQuote: async (input) => makeQuote({ id: 'new', text: input.text, date: input.date }),
    editQuote: async (input) => makeQuote({ id: input.id, text: input.text, date: input.date }),
    deleteQuote: async () => {},
    ...overrides
  };
}

function fakeCache(): QuoteStoreCache & { stored: Quote[] | null } {
  const state = { stored: null as Quote[] | null };
  return {
    get stored() { return state.stored; },
    loadCache: () => state.stored ? { quotes: state.stored, ageMs: 5000 } : null,
    saveCache: (quotes) => { state.stored = quotes; }
  };
}

describe('QuoteStore', () => {
  describe('loadCached', () => {
    it('returns null when cache is empty', () => {
      const store = createQuoteStore({ api: fakeApi(), cache: fakeCache() });
      expect(store.loadCached()).toBeNull();
    });

    it('returns cached quotes when cache has data', () => {
      const cache = fakeCache();
      cache.saveCache([makeQuote()]);
      const store = createQuoteStore({ api: fakeApi(), cache });
      const result = store.loadCached();
      expect(result).not.toBeNull();
      expect(result!.quotes).toHaveLength(1);
      expect(result!.ageMs).toBe(5000);
    });
  });

  describe('refresh', () => {
    it('returns fresh quotes from api and saves to cache', async () => {
      const cache = fakeCache();
      const quotes = [makeQuote({ id: 'fresh' })];
      const api = fakeApi({
        fetchQuotes: async () => ({ quotes, diagnostics: makeDiagnostics() })
      });
      const store = createQuoteStore({ api, cache });

      const result = await store.refresh();

      expect(result.quotes).toEqual(quotes);
      expect(result.diagnostics.source).toBe('primary');
      expect(cache.stored).toEqual(quotes);
    });

    it('returns stale cached data when api fails and cache exists', async () => {
      const cache = fakeCache();
      cache.saveCache([makeQuote({ id: 'stale' })]);
      const api = fakeApi({
        fetchQuotes: async () => { throw new Error('Network error'); }
      });
      const store = createQuoteStore({ api, cache });

      const result = await store.refresh();

      expect(result.quotes[0].id).toBe('stale');
      expect(result.diagnostics.source).toBe('cache');
      expect(result.diagnostics.error).toBe('Network error');
    });

    it('throws when api fails and no cache exists', async () => {
      const api = fakeApi({
        fetchQuotes: async () => { throw new Error('Network error'); }
      });
      const store = createQuoteStore({ api, cache: fakeCache() });

      await expect(store.refresh()).rejects.toThrow('Network error');
    });
  });

  describe('create', () => {
    it('calls api.createQuote then refreshes and returns full list', async () => {
      const cache = fakeCache();
      let createCalled = false;
      const api = fakeApi({
        createQuote: async (input) => {
          createCalled = true;
          return makeQuote({ id: 'new', text: input.text });
        }
      });
      const store = createQuoteStore({ api, cache });

      const result = await store.create({ text: 'Hello', date: '2026-08-25' });

      expect(createCalled).toBe(true);
      expect(result.quotes).toHaveLength(1);
      expect(cache.stored).not.toBeNull();
    });
  });

  describe('edit', () => {
    it('calls api.editQuote then refreshes and returns full list', async () => {
      let editedId = '';
      const api = fakeApi({
        editQuote: async (input) => {
          editedId = input.id;
          return makeQuote(input);
        }
      });
      const store = createQuoteStore({ api, cache: fakeCache() });

      const result = await store.edit({ id: 'q1', text: 'Updated', date: '2026-08-26' });

      expect(editedId).toBe('q1');
      expect(result.quotes).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('calls api.deleteQuote then refreshes and returns full list', async () => {
      let deletedId = '';
      const api = fakeApi({
        deleteQuote: async (id) => { deletedId = id; }
      });
      const store = createQuoteStore({ api, cache: fakeCache() });

      const result = await store.delete('q1');

      expect(deletedId).toBe('q1');
      expect(result.quotes).toHaveLength(1);
    });

    it('propagates api error without fallback to cache', async () => {
      const api = fakeApi({
        deleteQuote: async () => { throw new Error('NOT_FOUND'); }
      });
      const store = createQuoteStore({ api, cache: fakeCache() });

      await expect(store.delete('bad-id')).rejects.toThrow('NOT_FOUND');
    });
  });
});
