import type { Quote } from '../types';

const CACHE_KEY = 'hanushlasky:v2:quotes';
const CACHE_TS_KEY = 'hanushlasky:v2:quotes:ts';

export function loadCache(): { quotes: Quote[]; ageMs: number } | null {
  const raw = localStorage.getItem(CACHE_KEY);
  const ts = localStorage.getItem(CACHE_TS_KEY);

  if (!raw || !ts) {
    return null;
  }

  const parsedTs = Number.parseInt(ts, 10);
  if (Number.isNaN(parsedTs)) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Quote[];
    return {
      quotes: parsed,
      ageMs: Math.max(0, Date.now() - parsedTs)
    };
  } catch {
    return null;
  }
}

export function saveCache(quotes: Quote[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(quotes));
  localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
}
