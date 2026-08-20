import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { importMcpFileToProject, onMcpImported } from '../../core-aura-mcp/src/mcp/mcpImporter';
import { MCPValidator } from '../../packages/mcp-ingestor/src/validators/mcpValidator';

describe('MCP Ingest E2E', () => {
	let tmpDir: string;
	let destPath: string | null = null;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aura-mcp-test-'));
	});

	afterEach(async () => {
		if (destPath && (await fs.stat(destPath).catch(() => null))) {
			await fs.unlink(destPath).catch(() => {});
		}
		await fs.rmdir(tmpDir, { recursive: true }).catch(() => {});
	});

	it('importa y valida un MCP mínimo', async () => {
		const sample = {
			schemaVersion: '1.0.0',
			metadata: { title: 'Test MCP', description: 'Prueba', importedFrom: 'unit-test', importDate: new Date().toISOString(), wordCount: 3, lineCount: 1 },
			content: { raw: 'hola mundo', cleaned: 'hola mundo' },
			structure: { tools: [], resources: [], prompts: [] },
			status: 'raw_import'
		};

		const src = path.join(tmpDir, 'sample.mcp.json');
		await fs.writeFile(src, JSON.stringify(sample, null, 2), 'utf-8');

		// escuchar evento de importación
		const imported = await new Promise<string>((resolve, reject) => {
			const unsub = onMcpImported((p: any) => {
				unsub();
				resolve(p.path);
			});
			importMcpFileToProject(src, tmpDir).catch(reject);
		});

		expect(imported).toBeTruthy();
		destPath = imported;

		// validar con MCPValidator
		const validator = new MCPValidator();
		const res = await validator.validate(destPath, true);
		expect(res.valid).toBe(true);
	});
});
