import { describe, expect, it, vi, beforeEach } from 'vitest';

const MOCK_ENDPOINT = 'https://script.google.com/macros/s/FAKE/exec';
const MOCK_TOKEN = 'test-token';

vi.mock('../config', () => ({
  APP_CONFIG: {
    apiUrlPrimary: 'https://script.google.com/macros/s/FAKE/exec',
    apiUrlFallback: null,
    apiToken: 'test-token',
    cacheTtlMs: 300000
  }
}));

describe('editQuote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends GET with action=edit, id, text, date params', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'abc-123',
        date: '2026-08-25',
        text: 'updated text',
        createdAt: '2026-08-25T06:00:00Z',
        updatedAt: '2026-08-25T10:00:00Z'
      },
      meta: {
        apiVersion: '2.0.0',
        schemaVersion: 1,
        source: 'primary',
        fetchedAt: '2026-08-25T10:00:00Z'
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { editQuote } = await import('../lib/api');

    const result = await editQuote({
      id: 'abc-123',
      text: 'updated text',
      date: '2026-08-25'
    });

    expect(result).toEqual(mockResponse.data);

    const call = vi.mocked(fetch).mock.calls[0];
    const url = new URL(call[0] as string);
    expect(url.searchParams.get('action')).toBe('edit');
    expect(url.searchParams.get('id')).toBe('abc-123');
    expect(url.searchParams.get('text')).toBe('updated text');
    expect(url.searchParams.get('date')).toBe('2026-08-25');
    expect(url.searchParams.get('token')).toBe(MOCK_TOKEN);
  });

  it('throws on unsuccessful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        data: null,
        meta: {
          apiVersion: '2.0.0',
          schemaVersion: 1,
          source: 'primary',
          fetchedAt: '2026-08-25T10:00:00Z'
        },
        errorCode: 'NOT_FOUND',
        message: 'Quote not found'
      })
    });

    const { editQuote } = await import('../lib/api');

    await expect(
      editQuote({ id: 'bad-id', text: 'x', date: '2026-01-01' })
    ).rejects.toThrow('Quote not found');
  });
});

describe('deleteQuote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends GET with action=delete and id param', async () => {
    const mockResponse = {
      success: true,
      data: null,
      meta: {
        apiVersion: '2.0.0',
        schemaVersion: 1,
        source: 'primary',
        fetchedAt: '2026-08-25T10:00:00Z'
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { deleteQuote } = await import('../lib/api');

    await deleteQuote('abc-123');

    const call = vi.mocked(fetch).mock.calls[0];
    const url = new URL(call[0] as string);
    expect(url.searchParams.get('action')).toBe('delete');
    expect(url.searchParams.get('id')).toBe('abc-123');
    expect(url.searchParams.get('token')).toBe(MOCK_TOKEN);
  });

  it('throws on unsuccessful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        data: null,
        meta: {
          apiVersion: '2.0.0',
          schemaVersion: 1,
          source: 'primary',
          fetchedAt: '2026-08-25T10:00:00Z'
        },
        errorCode: 'NOT_FOUND',
        message: 'Quote not found'
      })
    });

    const { deleteQuote } = await import('../lib/api');

    await expect(
      deleteQuote('bad-id')
    ).rejects.toThrow('Quote not found');
  });
});
