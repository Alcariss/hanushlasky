import { APP_CONFIG } from '../config';
function appendToken(url) {
    if (APP_CONFIG.apiToken) {
        url.searchParams.set('token', APP_CONFIG.apiToken);
    }
}
function toQuotes(rows) {
    return rows.map((row) => ({
        id: row.id,
        date: row.date,
        text: row.text,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }));
}
async function readEndpoint(endpoint, source) {
    const url = new URL(endpoint);
    url.searchParams.set('action', 'fetch');
    appendToken(url);
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json());
    if (!payload.success) {
        throw new Error(payload.message ?? payload.errorCode ?? 'Unknown API error');
    }
    const apiVersion = response.headers.get('x-api-version') ?? payload.meta.apiVersion;
    const schemaVersion = Number(payload.meta.schemaVersion);
    if (apiVersion !== payload.meta.apiVersion) {
        throw new Error('API version mismatch');
    }
    if (schemaVersion !== 1) {
        throw new Error('SCHEMA_MISMATCH');
    }
    return {
        quotes: toQuotes(payload.data),
        diagnostics: {
            endpoint,
            source,
            fetchedAt: payload.meta.fetchedAt,
            cacheAgeSeconds: null,
            error: null
        }
    };
}
export async function fetchQuotes() {
    try {
        return await readEndpoint(APP_CONFIG.apiUrlPrimary, 'primary');
    }
    catch (error) {
        if (!APP_CONFIG.apiUrlFallback) {
            throw error;
        }
        const normalized = String(error);
        const canFallback = normalized.includes('SCHEMA_MISMATCH')
            || normalized.includes('SHEET_NOT_FOUND');
        if (!canFallback) {
            throw error;
        }
        return readEndpoint(APP_CONFIG.apiUrlFallback, 'fallback');
    }
}
