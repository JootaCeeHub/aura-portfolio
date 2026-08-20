import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '../../../core-aura-mcp/src/lib/logger';

export class FileManager {
	private outputDir: string;

	constructor(outputDir: string = './mcp_imported') {
		this.outputDir = outputDir;
	}

	async save(data: any, format: 'json' | 'yaml' | 'typescript', customName?: string): Promise<string> {
		await fs.mkdir(this.outputDir, { recursive: true });

		const filename = customName || `mcp-${Date.now()}`;
		let filepath = '';
		let content = '';

		switch (format) {
			case 'json':
				filepath = join(this.outputDir, `${filename}.mcp.json`);
				content = JSON.stringify(data, null, 2);
				break;
			case 'yaml':
				filepath = join(this.outputDir, `${filename}.mcp.yaml`);
				content = this.toYaml(data);
				break;
			case 'typescript':
				filepath = join(this.outputDir, `${filename}.mcp.ts`);
				content = this.toTypeScript(data);
				break;
		}

		await fs.writeFile(filepath, content, 'utf-8');
		Logger.info('fileManager.save.success', { path: filepath, format });

		return filepath;
	}

	private toYaml(obj: any, indent: number = 0): string {
		// Stub: implementar con library yaml
		return JSON.stringify(obj);
	}

	private toTypeScript(data: any): string {
		return `// Auto-generated MCP module
export const MCP_MODULE = ${JSON.stringify(data, null, 2)} as const;
`;
	}
}
