import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	TextContent,
	ToolUseBlock,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Logger } from '../../core-aura-mcp/src/lib/logger';
import { PDFParser } from './parsers/pdf';
import { TextParser } from './parsers/text';
import { MCPBuilder } from './builders/mcpBuilder';
import { MCPValidator } from './validators/mcpValidator';
import { FileManager } from './managers/fileManager';

// ===== SCHEMAS =====
const IngestDocumentSchema = z.object({
	filePath: z.string().describe('Ruta del archivo PDF, TXT, DOCX'),
	outputFormat: z.enum(['json', 'yaml', 'typescript']).default('json'),
	autoRefine: z.boolean().default(true).describe('Ejecutar análisis automático'),
	importName: z.string().optional().describe('Nombre personalizado para el MCP'),
});

const ValidateMCPSchema = z.object({
	mcpPath: z.string().describe('Ruta del archivo MCP JSON a validar'),
	strict: z.boolean().default(false).describe('Validación estricta'),
});

const RefineDocumentSchema = z.object({
	mcpPath: z.string().describe('Ruta del MCP a refinar'),
	extractTools: z.boolean().default(true),
	extractResources: z.boolean().default(true),
	generatePrompts: z.boolean().default(true),
});

// ===== MCP INGESTOR SERVER =====
class MCPIngestorServer {
	private server: Server;
	private pdfParser: PDFParser;
	private textParser: TextParser;
	private mcpBuilder: MCPBuilder;
	private mcpValidator: MCPValidator;
	private fileManager: FileManager;

	constructor() {
		this.server = new Server({
			name: 'mcp-ingestor',
			version: '1.0.0',
		});

		this.pdfParser = new PDFParser();
		this.textParser = new TextParser();
		this.mcpBuilder = new MCPBuilder();
		this.mcpValidator = new MCPValidator();
		this.fileManager = new FileManager();

		this.setupTools();
	}

	private setupTools(): void {
		// Tool 1: Ingest Document
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: 'ingest_document',
					description: 'Ingiere un documento PDF/TXT y lo convierte a estructura MCP',
					inputSchema: {
						type: 'object',
						properties: {
							filePath: { type: 'string', description: 'Ruta del documento' },
							outputFormat: {
								type: 'string',
								enum: ['json', 'yaml', 'typescript'],
								description: 'Formato de salida',
							},
							autoRefine: {
								type: 'boolean',
								description: 'Ejecutar refinamiento automático',
							},
							importName: { type: 'string', description: 'Nombre personalizado' },
						},
						required: ['filePath'],
					},
				},
				{
					name: 'validate_mcp',
					description: 'Valida un archivo MCP contra el schema AURA',
					inputSchema: {
						type: 'object',
						properties: {
							mcpPath: { type: 'string', description: 'Ruta del MCP JSON' },
							strict: { type: 'boolean', description: 'Validación estricta' },
						},
						required: ['mcpPath'],
					},
				},
				{
					name: 'refine_document',
					description: 'Refina un MCP para extraer tools, recursos, prompts',
					inputSchema: {
						type: 'object',
						properties: {
							mcpPath: { type: 'string', description: 'Ruta del MCP' },
							extractTools: { type: 'boolean', description: 'Extraer tools' },
							extractResources: { type: 'boolean', description: 'Extraer recursos' },
							generatePrompts: { type: 'boolean', description: 'Generar prompts' },
						},
						required: ['mcpPath'],
					},
				},
			],
		}));

		// Tool handlers
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request;

			try {
				if (name === 'ingest_document') {
					return await this.ingestDocument(args);
				} else if (name === 'validate_mcp') {
					return await this.validateMCP(args);
				} else if (name === 'refine_document') {
					return this.refineMCP(args);
				} else {
					return {
						isError: true,
						content: [{ type: 'text', text: `Tool desconocida: ${name}` }],
					};
				}
			} catch (error) {
				Logger.error('mcp-ingestor.tool.error', { name, error: (error as Error).message });
				return {
					isError: true,
					content: [
						{ type: 'text', text: `Error al ejecutar ${name}: ${(error as Error).message}` },
					],
				};
			}
		});
	}

	private async ingestDocument(args: any) {
		const params = IngestDocumentSchema.parse(args);

		Logger.info('mcp-ingestor.ingest.start', { file: params.filePath });

		// Extraer texto
		let text: string;
		if (params.filePath.endsWith('.pdf')) {
			text = await this.pdfParser.parse(params.filePath);
		} else if (params.filePath.endsWith('.txt')) {
			text = await this.textParser.parse(params.filePath);
		} else {
			throw new Error(`Formato no soportado: ${params.filePath}`);
		}

		// Construir MCP
		const mcpData = this.mcpBuilder.build(text, params.importName || params.filePath);

		// Guardar
		const outputPath = await this.fileManager.save(
			mcpData,
			params.outputFormat,
			params.importName
		);

		Logger.info('mcp-ingestor.ingest.complete', { output: outputPath });

		return {
			isError: false,
			content: [
				{
					type: 'text',
					text: `✅ Documento ingested y guardado en: ${outputPath}\nProximo paso: aura refine ${outputPath}`,
				},
			],
		};
	}

	private async validateMCP(args: any) {
		const params = ValidateMCPSchema.parse(args);

		Logger.info('mcp-ingestor.validate.start', { file: params.mcpPath });

		const result = await this.mcpValidator.validate(params.mcpPath, params.strict);

		const message = result.valid
			? `✅ MCP válido\n${result.warnings?.length ? `⚠️  ${result.warnings.length} warnings` : ''}`
			: `❌ MCP inválido\nErrores: ${result.errors?.join(', ')}`;

		return {
			isError: !result.valid,
			content: [{ type: 'text', text: message }],
		};
	}

	private refineMCP(args: any) {
		const params = RefineDocumentSchema.parse(args);

		Logger.info('mcp-ingestor.refine.start', { file: params.mcpPath });

		// Stub: En prod, integrar con Developer + Analyst agentes para análisis automático
		return {
			isError: false,
			content: [
				{
					type: 'text',
					text: `🔄 Refinamiento iniciado para ${params.mcpPath}\nIntegración pendiente con AURA Orchestrator para análisis automático`,
				},
			],
		};
	}

	async start(): Promise<void> {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		Logger.info('mcp-ingestor.server.started');
	}
}

// ===== MAIN =====
const server = new MCPIngestorServer();
server.start().catch((error) => {
	Logger.error('mcp-ingestor.startup.failed', { error: error.message });
	process.exit(1);
});
