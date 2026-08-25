const CACHE_KEY = 'hanushlasky:v2:quotes';
const CACHE_TS_KEY = 'hanushlasky:v2:quotes:ts';
export function loadCache() {
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
        const parsed = JSON.parse(raw);
        return {
            quotes: parsed,
            ageMs: Math.max(0, Date.now() - parsedTs)
        };
    }
    catch {
        return null;
    }
}
export function saveCache(quotes) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quotes));
    localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
}
