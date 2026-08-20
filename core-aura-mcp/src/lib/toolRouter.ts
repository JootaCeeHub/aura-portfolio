import { Logger } from './logger.js';
import { eventBus } from './eventBus.js';

/**
 * Definición de herramienta.
 */
export interface ToolDefinition {
	name: string;
	description: string;
	handler: (args: any) => Promise<any>;
	requiredScope?: string;
}

/**
 * Enrutador de herramientas.
 * Descentralizado: agentes registran sus herramientas, router las ejecuta.
 */
export class ToolRouter {
	private tools: Map<string, ToolDefinition> = new Map();

	constructor() {
		Logger.debug('toolRouter.initialized');
		this.registerBuiltinTools();
	}

	/**
	 * Registrar una herramienta.
	 */
	registerTool(tool: ToolDefinition): void {
		if (!tool.name || !tool.handler) {
			throw new Error('Tool debe tener name y handler');
		}

		this.tools.set(tool.name, tool);
		Logger.debug('toolRouter.tool.registered', { toolName: tool.name });
	}

	/**
	 * Ejecutar una herramienta.
	 */
	async executeTool(toolName: string, args: any, agentId?: string, correlationId?: string): Promise<any> {
		const tool = this.tools.get(toolName);
		if (!tool) {
			throw new Error(`Tool no encontrada: ${toolName}`);
		}

		const startTime = Date.now();

		try {
			const result = await tool.handler(args);
			const latencyMs = Date.now() - startTime;

			// Publicar evento
			await eventBus.publishEvent({
				type: 'ToolExecuted',
				toolName,
				agentId: agentId ?? 'unknown',
				success: true,
				latencyMs,
				timestamp: Date.now(),
				correlationId,
			});

			Logger.debug('toolRouter.tool.executed', { toolName, latencyMs });
			return result;
		} catch (err) {
			const latencyMs = Date.now() - startTime;

			// Publicar evento
			await eventBus.publishEvent({
				type: 'ToolExecuted',
				toolName,
				agentId: agentId ?? 'unknown',
				success: false,
				latencyMs,
				timestamp: Date.now(),
				correlationId,
			});

			Logger.error('toolRouter.tool.execution_failed', {
				toolName,
				error: (err as Error).message,
			});

			throw err;
		}
	}

	/**
	 * Obtener herramienta.
	 */
	getTool(name: string): ToolDefinition | undefined {
		return this.tools.get(name);
	}

	/**
	 * Listar todas las herramientas.
	 */
	listTools(): ToolDefinition[] {
		return Array.from(this.tools.values());
	}

	/**
	 * Registrar herramientas built-in.
	 */
	private registerBuiltinTools(): void {
		this.registerTool({
			name: 'code.analyze',
			description: 'Analizar código',
			handler: async () => {
				return { analysis: 'Mock analysis for unknown' };
			},
		});

		this.registerTool({
			name: 'data.query',
			description: 'Consultar datos',
			handler: async () => {
				return { rows: [{ id: 1, value: 'mock data' }] };
			},
		});

		this.registerTool({
			name: 'report.generate',
			description: 'Generar reporte',
			handler: async () => {
				return { reportId: 'rpt-' + Date.now(), status: 'generated' };
			},
		});
	}

	/**
	 * Reset.
	 */
	reset(): void {
		this.tools.clear();
		this.registerBuiltinTools();
	}
}

export const toolRouter = new ToolRouter();

