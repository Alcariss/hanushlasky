const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
function asNullable(value) {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function parseTtl(value) {
    if (!value) {
        return DEFAULT_CACHE_TTL_MS;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return DEFAULT_CACHE_TTL_MS;
    }
    return parsed;
}
export const APP_CONFIG = {
    apiUrlPrimary: import.meta.env.VITE_API_URL_PRIMARY,
    apiUrlFallback: asNullable(import.meta.env.VITE_API_URL_FALLBACK),
    apiToken: asNullable(import.meta.env.VITE_API_TOKEN),
    cacheTtlMs: parseTtl(import.meta.env.VITE_CACHE_TTL_MS)
};
export const UI_CONFIG = {
    appName: import.meta.env.VITE_APP_NAME ?? 'Hlášky',
    showDebug: new URLSearchParams(window.location.search).get('debug') === '1'
};
