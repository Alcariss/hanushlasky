import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const env = {
	GRIST_API_KEY: 'test-key',
	GRIST_DOCUMENT_ID: 'document-id',
	GRIST_TABLE_ID: 'Sheet1',
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('quote API', () => {
	it('returns quotes from Grist for fetch requests', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({
				records: [
					{
						id: 1,
						fields: {
							id: 'quote-id', date: '2026-09-01', text: 'Quote',
							created_at: '2026-09-01T08:00:00.000Z', updated_at: 'updated',
						},
					},
					{
						id: 2,
						fields: {
							date: '2026-09-01', text: 'Newer same-day quote',
							created_at: '2026-09-01T12:00:00.000Z', updated_at: 'updated',
						},
					},
				],
			})),
		);

		const response = await worker.fetch(
			new Request('https://api.example/?action=fetch'),
			env,
			{} as ExecutionContext,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			success: true,
			data: [
				{ id: '2', date: '2026-09-01', text: 'Newer same-day quote' },
				{ id: '1', date: '2026-09-01', text: 'Quote' },
			],
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'https://docs.getgrist.com/api/docs/document-id/tables/Sheet1/records',
			expect.objectContaining({ method: 'GET' }),
		);
	});

	it('rejects unknown actions without requesting Grist', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch');
		const response = await worker.fetch(
			new Request('https://api.example/?action=unknown'),
			env,
			{} as ExecutionContext,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ errorCode: 'UNSUPPORTED_ACTION' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('creates a Grist record without a quote id', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ records: [{ id: 2, fields: {} }] })),
		);
		const response = await worker.fetch(
			new Request('https://api.example/?action=add&text=Quote&date=2026-09-01'),
			env,
			{} as ExecutionContext,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ success: true, data: { text: 'Quote' } });
		expect(fetchMock).toHaveBeenCalledWith(
			'https://docs.getgrist.com/api/docs/document-id/tables/Sheet1/records',
			expect.objectContaining({
				body: expect.stringContaining('quote_uuid'),
				method: 'POST',
			}),
		);
	});

	it('deletes a Grist record using its numeric record ID', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify({
				records: [{
					id: 7,
					fields: {
						date: '2026-09-01', text: 'Quote',
						created_at: 'created', updated_at: 'updated',
					},
				}],
			})))
			.mockResolvedValueOnce(new Response('{}'));

		const response = await worker.fetch(
			new Request('https://api.example/?action=delete&id=7'),
			env,
			{} as ExecutionContext,
		);

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenLastCalledWith(
			'https://docs.getgrist.com/api/docs/document-id/apply',
			expect.objectContaining({
				body: JSON.stringify([['RemoveRecord', 'Sheet1', 7]]),
				method: 'POST',
			}),
		);
	});
});
