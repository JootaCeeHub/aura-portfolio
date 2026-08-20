import { Logger } from '../../../core-aura-mcp/src/lib/logger';

export interface MCPDocument {
	schemaVersion: string;
	metadata: {
		title: string;
		description: string;
		importedFrom: string;
		importDate: string;
		wordCount: number;
		lineCount: number;
	};
	content: {
		raw: string;
		cleaned: string;
	};
	structure: {
		tools: any[];
		resources: any[];
		prompts: any[];
	};
	notes: string[];
	status: 'raw_import' | 'refined' | 'validated' | 'published';
	nextSteps: string[];
}

export class MCPBuilder {
	build(text: string, source: string): MCPDocument {
		const cleaned = this.cleanText(text);
		const lines = cleaned.split('\n');
		const title = lines[0] || 'Imported Document';

		Logger.debug('mcpBuilder.build', { source, size: text.length });

		return {
			schemaVersion: '1.0.0',
			metadata: {
				title,
				description: `MCP module imported from ${source}`,
				importedFrom: source,
				importDate: new Date().toISOString(),
				wordCount: text.split(/\s+/).length,
				lineCount: lines.length,
			},
			content: {
				raw: text,
				cleaned,
			},
			structure: {
				tools: [],
				resources: [],
				prompts: [],
			},
			notes: [
				'Documento importado automáticamente',
				'Refinar con AURA Orchestrator para extraer tools MCP',
				'Ejecutar: aura refine para procesamiento automático',
			],
			status: 'raw_import',
			nextSteps: [
				'1. Revisar contenido en AURA Dashboard',
				'2. Ejecutar análisis con DeveloperAgent',
				'3. Generar tools/resources/prompts',
				'4. Validar contra MCP schema',
				'5. Commit al repositorio',
			],
		};
	}

	private cleanText(text: string): string {
		// Remover líneas vacías múltiples
		const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
		return lines.join('\n');
	}
}
