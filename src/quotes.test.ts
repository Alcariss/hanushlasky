import { describe, expect, it } from 'vitest';
import { shareText, toQuote, toQuoteParams } from './quotes';

describe('toQuote', () => {
  it('reads a row from the worker', () => {
    const row = { id: '7', date: '2026-11-01', text: 'Ahoj', createdAt: 'c', updatedAt: 'u', extra: 1 };

    expect(toQuote(row)).toEqual({ id: '7', date: '2026-11-01', text: 'Ahoj', createdAt: 'c', updatedAt: 'u' });
  });

  it('rejects a row whose shape changed', () => {
    expect(() => toQuote({ id: 7 })).toThrow('id is not a string');
    expect(() => toQuote(null)).toThrow('not an object');
  });
});

describe('toQuoteParams', () => {
  it('sends only the worker fields, with the text trimmed', () => {
    expect(toQuoteParams({ date: '2026-11-01', text: '  Ahoj \n' })).toEqual({ date: '2026-11-01', text: 'Ahoj' });
  });
});

describe('shareText', () => {
  it('quotes the text and puts the date below', () => {
    expect(shareText('Ahoj', '1. 11. 2026')).toBe('"Ahoj"\n1. 11. 2026');
  });
});
