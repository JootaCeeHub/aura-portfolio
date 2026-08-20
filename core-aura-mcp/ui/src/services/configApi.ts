const base = '/api/config';

async function handleRes(res: Response) {
	// ...existing code...
	if (!res.ok) {
		const txt = await res.text();
		throw new Error(txt || `${res.status} ${res.statusText}`);
	}
	const ct = res.headers.get('content-type') || '';
	if (ct.includes('application/json')) return res.json();
	return res.text();
}

export async function getConfig() {
	const res = await fetch(base, { credentials: 'same-origin' });
	return handleRes(res);
}

export async function putConfig(config: any) {
	const res = await fetch(base, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(config),
		credentials: 'same-origin'
	});
	return handleRes(res);
}

export async function previewConfig(config: any) {
	const res = await fetch(`${base}/preview`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(config),
		credentials: 'same-origin'
	});
	return handleRes(res);
}

export async function getHistory() {
	const res = await fetch(`${base}/history`, { credentials: 'same-origin' });
	return handleRes(res);
}

export async function restoreSnapshot(file: string) {
	const res = await fetch(`${base}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ file }),
		credentials: 'same-origin'
	});
	return handleRes(res);
}
