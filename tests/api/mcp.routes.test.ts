import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startServer } from '../../core-aura-mcp/src/mcpServer';
import { promises as fs } from 'fs';
import path from 'path';

describe('API /api/mcp routes', () => {
	let serv: any;
	let app: any;

	beforeAll(async () => {
		serv = await startServer({ port: 0, enableWs: false });
		app = serv.app || serv;
	});

	afterAll(async () => {
		await serv.close?.();
	});

	describe('GET /api/mcp', () => {
		it('lista MCPs vacío si no hay archivos', async () => {
			const res = await request(app).get('/api/mcp');

			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty('mcps');
			expect(Array.isArray(res.body.mcps)).toBe(true);
		});
	});

	describe('POST /api/mcp/validate', () => {
		it('valida MCP válido', async () => {
			const valid = {
				schemaVersion: '1.0.0',
				metadata: { title: 'Test', description: 'Test', importedFrom: 'api-test', importDate: new Date().toISOString(), wordCount: 1, lineCount: 1 },
				content: { raw: 'x', cleaned: 'x' },
				structure: { tools: [], resources: [], prompts: [] },
				status: 'raw_import'
			};

			const res = await request(app).post('/api/mcp/validate').send(valid);

			expect(res.status).toBe(200);
			expect(res.body.valid).toBe(true);
		});

		it('rechaza MCP inválido (faltan campos)', async () => {
			const invalid = { schemaVersion: '1.0.0' };

			const res = await request(app).post('/api/mcp/validate').send(invalid);

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty('error');
		});
	});
});
