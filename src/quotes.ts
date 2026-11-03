import type { RequestParams } from '@alcariss/pwa-kit';

/** Mirrors the `quotes` table of the `hanushlasky` entry in the worker's `apps.ts`. */
export type Quote = {
  id: string;
  date: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type QuoteInput = {
  date: string;
  text: string;
};

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') {
    throw new Error(`Quote row: ${key} is not a string`);
  }
  return value;
}

export function toQuote(row: unknown): Quote {
  if (typeof row !== 'object' || row === null) {
    throw new Error('Quote row is not an object');
  }
  const record = row as Record<string, unknown>;
  return {
    id: readString(record, 'id'),
    date: readString(record, 'date'),
    text: readString(record, 'text'),
    createdAt: readString(record, 'createdAt'),
    updatedAt: readString(record, 'updatedAt')
  };
}

export function toQuoteParams(input: QuoteInput): RequestParams {
  return { date: input.date, text: input.text.trim() };
}

/** What the share sheet sends: the quote in quotes, then its date. */
export function shareText(text: string, formattedDate: string): string {
  return `"${text}"\n${formattedDate}`;
}
