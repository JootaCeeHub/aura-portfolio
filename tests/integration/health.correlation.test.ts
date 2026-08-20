import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMcpServer } from '../../core-aura-mcp/src/mcpServer';
import { Logger } from '../../core-aura-mcp/src/lib/logger';

describe('Integration: /health correlationId', () => {
	beforeEach(() => {
		// limpiar y activar captura en memoria
		Logger.clearMemoryLogs();
		Logger.addMemoryTransport();
	});

	afterEach(() => {
		Logger.clearMemoryLogs();
	});

	it('debe retornar X-Correlation-ID y el mismo debe aparecer en logs', async () => {
		const app = createMcpServer();
		const res = await request(app).get('/health').expect(200);
		const cid = res.header['x-correlation-id'];
		expect(cid).toBeDefined();

		// esperar mínima consistencia: logs capturados contienen correlationId
		const logs = Logger.getMemoryLogs();
		const found = logs.some((entry: any) => {
			// entries pueden ser objetos o strings
			const obj = typeof entry === 'string' ? tryParse(entry) : entry;
			return obj && (obj.correlationId === cid || (obj.meta && obj.meta.correlationId === cid));
		});
		expect(found).toBe(true);
	});
});

// helper local
function tryParse(input: string) {
	try {
		return JSON.parse(input);
	} catch {
		return null;
	}
}
