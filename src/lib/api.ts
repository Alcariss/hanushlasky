import { APP_CONFIG } from '../config';
import type {
  ApiResponse,
  Diagnostics,
  NewQuote,
  Quote
} from '../types';

function appendToken(url: URL): void {
  if (APP_CONFIG.apiToken) {
    url.searchParams.set('token', APP_CONFIG.apiToken);
  }
}

function toQuotes(rows: Quote[]): Quote[] {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    text: row.text,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

async function readEndpoint(
  endpoint: string,
  source: 'primary' | 'fallback'
): Promise<{ quotes: Quote[]; diagnostics: Diagnostics }> {
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

  const payload = (await response.json()) as ApiResponse<Quote[]>;

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

export async function fetchQuotes(): Promise<{ quotes: Quote[]; diagnostics: Diagnostics }> {
  try {
    return await readEndpoint(APP_CONFIG.apiUrlPrimary, 'primary');
  } catch (error) {
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

export async function createQuote(
  input: NewQuote
): Promise<Quote> {
  const url = new URL(APP_CONFIG.apiUrlPrimary);
  url.searchParams.set('action', 'add');
  url.searchParams.set('text', input.text);
  url.searchParams.set('date', input.date);
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

  const payload = (
    await response.json()
  ) as ApiResponse<Quote>;

  if (!payload.success) {
    throw new Error(
      payload.message
        ?? payload.errorCode
        ?? 'Failed to create quote'
    );
  }

  return payload.data;
}
