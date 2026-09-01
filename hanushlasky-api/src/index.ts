type Quote = {
	id: string;
	date: string;
	text: string;
	createdAt: string;
	updatedAt: string;
};

type GristRecord = {
	id: number;
	fields: Record<string, unknown>;
};

type Env = {
	GRIST_API_KEY: string;
	GRIST_DOCUMENT_ID: string;
	GRIST_TABLE_ID: string;
};

const API_VERSION = '2.0.0';
const SCHEMA_VERSION = 1;
const ALLOWED_ORIGIN = 'https://alcariss.github.io';

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
}

function responseMeta(): Record<string, string | number> {
	return {
		apiVersion: API_VERSION,
		schemaVersion: SCHEMA_VERSION,
		source: 'primary',
		fetchedAt: new Date().toISOString(),
	};
}

function errorResponse(errorCode: string, message: string, status = 400): Response {
	return jsonResponse({ success: false, data: null, meta: responseMeta(), errorCode, message }, status);
}

function gristUrl(env: Env): string {
	return `https://docs.getgrist.com/api/docs/${env.GRIST_DOCUMENT_ID}/tables/${env.GRIST_TABLE_ID}/records`;
}

function gristApplyUrl(env: Env): string {
	return `https://docs.getgrist.com/api/docs/${env.GRIST_DOCUMENT_ID}/apply`;
}

async function gristRequest(
	env: Env,
	method: 'GET' | 'POST' | 'PATCH',
	body?: object,
	url = gristUrl(env),
): Promise<Response> {
	return fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${env.GRIST_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

function toQuote(record: GristRecord): Quote {
	return {
		id: String(record.id),
		date: String(record.fields.date),
		text: String(record.fields.text),
		createdAt: String(record.fields.created_at),
		updatedAt: String(record.fields.updated_at),
	};
}

function sortQuotesByDate(quotes: Quote[]): Quote[] {
	return quotes.sort((left, right) => {
		const dateDifference = new Date(right.date).getTime() - new Date(left.date).getTime();
		if (dateDifference !== 0) {
			return dateDifference;
		}

		return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
	});
}

async function getRecords(env: Env): Promise<GristRecord[]> {
	const response = await gristRequest(env, 'GET');
	if (!response.ok) {
		throw new Error(`Grist request failed with HTTP ${response.status}`);
	}
	const data = (await response.json()) as { records: GristRecord[] };
	return data.records;
}

function requiredParams(url: URL, names: string[]): string | null {
	return names.find((name) => !url.searchParams.get(name)?.trim()) ?? null;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
			},
		});
	}

	if (request.method !== 'GET') {
		return errorResponse('METHOD_NOT_ALLOWED', 'Only GET requests are supported', 405);
	}

	const url = new URL(request.url);
	const action = url.searchParams.get('action');
	if (!action || !['fetch', 'add', 'edit', 'delete'].includes(action)) {
		return errorResponse('UNSUPPORTED_ACTION', 'Unsupported action');
	}

	const missing = requiredParams(
		url,
		action === 'fetch' ? [] : action === 'add' ? ['text', 'date'] : action === 'delete' ? ['id'] : ['id', 'text', 'date'],
	);
	if (missing) {
		return errorResponse('VALIDATION_ERROR', `${missing} is required`);
	}

	try {
		if (action === 'fetch') {
			const records = await getRecords(env);
			const quotes = sortQuotesByDate(records.map(toQuote));
			return jsonResponse({ success: true, data: quotes, meta: responseMeta() });
		}

		if (action === 'add') {
			const now = new Date().toISOString();
			const text = url.searchParams.get('text') as string;
			const date = url.searchParams.get('date') as string;
			const quoteUuid = crypto.randomUUID();
			const quote = { date, text, createdAt: now, updatedAt: now };
			const response = await gristRequest(env, 'POST', {
				records: [{
					fields: {
						quote_uuid: quoteUuid,
						date,
						text,
						created_at: now,
						updated_at: now,
					},
				}],
			});
			if (!response.ok) {
				throw new Error(`Grist request failed with HTTP ${response.status}`);
			}
			const created = (await response.json()) as { records: GristRecord[] };
			return jsonResponse({
				success: true,
				data: { ...quote, id: String(created.records[0].id) },
				meta: responseMeta(),
			});
		}

		const id = url.searchParams.get('id') as string;
		const records = await getRecords(env);
		const record = records.find((candidate) => String(candidate.id) === id);
		if (!record) {
			return errorResponse('NOT_FOUND', 'Quote not found', 404);
		}

		if (action === 'delete') {
			const response = await gristRequest(
				env,
				'POST',
				[['RemoveRecord', env.GRIST_TABLE_ID, record.id]],
				gristApplyUrl(env),
			);
			if (!response.ok) {
				throw new Error(`Grist request failed with HTTP ${response.status}`);
			}
			return jsonResponse({ success: true, data: null, meta: responseMeta() });
		}

		const now = new Date().toISOString();
		const text = url.searchParams.get('text') as string;
		const date = url.searchParams.get('date') as string;
		const fields = { date, text, updated_at: now };
		const response = await gristRequest(
			env,
			'PATCH',
			{ records: [{ id: record.id, fields }] },
		);
		if (!response.ok) {
			throw new Error(`Grist request failed with HTTP ${response.status}`);
		}
		const quote = { ...toQuote(record), date, text, updatedAt: now };
		return jsonResponse({ success: true, data: quote, meta: responseMeta() });
	} catch (error) {
		return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : String(error), 502);
	}
}

export default {
	fetch(request, env): Promise<Response> {
		return handleRequest(request, env);
	},
} satisfies ExportedHandler<Env>;
