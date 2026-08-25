export type Quote = {
  id: string;
  date: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiMeta = {
  apiVersion: string;
  schemaVersion: number;
  source: 'primary' | 'fallback';
  fetchedAt: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta: ApiMeta;
  errorCode?: string;
  message?: string;
};

export type ApiConfig = {
  apiUrlPrimary: string;
  apiUrlFallback: string | null;
  apiToken: string | null;
  cacheTtlMs: number;
};

export type NewQuote = {
  text: string;
  date: string;
};

export type Diagnostics = {
  endpoint: string;
  source: 'primary' | 'fallback' | 'cache';
  fetchedAt: string;
  cacheAgeSeconds: number | null;
  error: string | null;
};
