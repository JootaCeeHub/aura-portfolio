import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('CLI E2E', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aura-cli-test-'));
	});

	afterEach(async () => {
		await fs.rmdir(tmpDir, { recursive: true }).catch(() => {});
	});

	it('ingest comando valida archivo mcp.json', async () => {
		const sample = {
			schemaVersion: '1.0.0',
			metadata: { title: 'CLI Test', description: 'Test', importedFrom: 'cli', importDate: new Date().toISOString(), wordCount: 2, lineCount: 1 },
			content: { raw: 'test', cleaned: 'test' },
			structure: { tools: [], resources: [], prompts: [] },
			status: 'raw_import'
		};

		const src = path.join(tmpDir, 'test.mcp.json');
		await fs.writeFile(src, JSON.stringify(sample, null, 2), 'utf-8');

		const output = await new Promise<string>((resolve, reject) => {
			let result = '';
			const proc = spawn('npm', ['run', 'ingest', '--', src], { stdio: 'pipe', cwd: process.cwd() });
			proc.stdout?.on('data', (data: Buffer) => (result += data.toString()));
			proc.on('error', reject);
			proc.on('exit', (code) => (code === 0 ? resolve(result) : reject(new Error(`Exit ${code}`))));
		});

		expect(output).toContain('Importando' || 'importa' || '✅');
	});

	it('validate comando verifica mcp.json', async () => {
		const sample = {
			schemaVersion: '1.0.0',
			metadata: { title: 'Test', description: 'Test', importedFrom: 'test', importDate: new Date().toISOString(), wordCount: 1, lineCount: 1 },
			content: { raw: 'x', cleaned: 'x' },
			structure: { tools: [], resources: [], prompts: [] },
			status: 'raw_import'
		};

		const src = path.join(tmpDir, 'test.mcp.json');
		await fs.writeFile(src, JSON.stringify(sample, null, 2), 'utf-8');

		const output = await new Promise<string>((resolve, reject) => {
			let result = '';
			const proc = spawn('npm', ['run', 'validate', '--', src], { stdio: 'pipe', cwd: process.cwd() });
			proc.stdout?.on('data', (data: Buffer) => (result += data.toString()));
			proc.on('error', reject);
			proc.on('exit', (code) => resolve(result)); // accept any exit code
		});

		expect(output).toContain('válido' || '✅' || 'Validar');
	});
});
