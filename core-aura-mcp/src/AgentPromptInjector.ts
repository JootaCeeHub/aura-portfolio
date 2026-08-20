import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import chokidar from 'chokidar'; // <-- reemplaza require dinámico

import {
	AgentTemplateBuilder,
	ORCHESTRATOR_TEMPLATE,
	DEVELOPER_TEMPLATE,
	TRADING_TEMPLATE,
	ANALYST_TEMPLATE,
} from '../core/agentTemplateBuilder.js';
import { Logger } from './lib/logger.js';

export type AgentPromptPayload = {
	agentId: string;
	prompt: string;
	timestamp: string;
	correlationId?: string;
};

export const AgentEvents = new EventEmitter();

// Debounce map para evitar emisiones en ráfaga por agentId
const debounceMap: Map<string, NodeJS.Timeout> = new Map();
// Cola temporal para el último payload por agentId
const pendingPayloads: Map<string, AgentPromptPayload> = new Map();
// Tiempo por defecto de debounce en ms
const DEFAULT_DEBOUNCE_MS = 200;

// Instancia global del template builder con composición de reglas
const templateBuilder = new AgentTemplateBuilder();

// Registrar templates predefinidos
templateBuilder.registerTemplate(ORCHESTRATOR_TEMPLATE);
templateBuilder.registerTemplate(DEVELOPER_TEMPLATE);
templateBuilder.registerTemplate(TRADING_TEMPLATE);
templateBuilder.registerTemplate(ANALYST_TEMPLATE);

/**
 * Construir prompt para un agente usando templates predefinidos o custom.
 * Prioriza: template registrado > fields custom > fallback simple.
 */
export async function buildForAgent(definition: any, opts?: any): Promise<string> {
	try {
		const agentName = definition?.name ?? 'unknown';
		const context = opts?.data ?? {};

		// 1. Intentar usar template registrado
		const registeredTemplate = templateBuilder.getTemplate(agentName);
		if (registeredTemplate) {
			const prompt = templateBuilder.buildFromTemplate(agentName, undefined, context);
			Logger.debug('agentPromptInjector.buildForAgent.fromTemplate', { agentName });
			return prompt;
		}

		// 2. Construir custom si tiene campos mínimos
		if (definition?.persona && definition?.mission) {
			const tools = definition?.tools ?? [];
			const rules = definition?.rules;
			const ruleComponents = definition?.ruleComponents;
			const prompt = templateBuilder.buildPrompt(
				definition.persona,
				definition.mission,
				tools,
				rules,
				ruleComponents,
				context,
			);
			Logger.debug('agentPromptInjector.buildForAgent.custom', { agentName });
			return prompt;
		}

		// 3. Fallback simple
		const simple = `Eres ${agentName}. ${JSON.stringify(opts ?? {})}`;
		Logger.warn('agentPromptInjector.buildForAgent.fallback', { agentName });
		return simple;
	} catch (err) {
		Logger.error('agentPromptInjector.buildForAgent.error', { error: (err as Error).message });
		throw err;
	}
}

// Emitir inmediatamente (sin debounce)
export async function injectPromptImmediate(agentId: string, prompt: string): Promise<void> {
	const correlationId = Logger.getCorrelationId();
	const payload: AgentPromptPayload = {
		agentId,
		prompt,
		timestamp: new Date().toISOString(),
		correlationId: correlationId ?? undefined,
	};

	AgentEvents.emit('agent:promptInjected', payload);
	Logger.info('agent.prompt.injected', { agentId, promptLength: prompt.length });
}

// Función principal con debounce (evita emitir muchas veces seguidas)
export async function injectPrompt(agentId: string, prompt: string, debounceMs = DEFAULT_DEBOUNCE_MS): Promise<void> {
	const correlationId = Logger.getCorrelationId();
	const payload: AgentPromptPayload = {
		agentId,
		prompt,
		timestamp: new Date().toISOString(),
		correlationId: correlationId ?? undefined,
	};

	// Guardar último payload
	pendingPayloads.set(agentId, payload);

	// Si ya hay un timeout, resetearlo
	const existing = debounceMap.get(agentId);
	if (existing) {
		clearTimeout(existing);
	}

	// Programar emisión al terminar el debounce
	const t = setTimeout(() => {
		const p = pendingPayloads.get(agentId);
		if (p) {
			AgentEvents.emit('agent:promptInjected', p);
			Logger.info('agent.prompt.injected.debounced', {
				agentId: p.agentId,
				promptLength: p.prompt.length,
			});
			pendingPayloads.delete(agentId);
		}
		debounceMap.delete(agentId);
	}, debounceMs);
	debounceMap.set(agentId, t);
}

// Helper para suscribirse de forma simple (retorna función de unsubscribe)
export function onPromptInjected(cb: (payload: AgentPromptPayload) => void): () => void {
	AgentEvents.on('agent:promptInjected', cb);
	return () => {
		AgentEvents.off('agent:promptInjected', cb);
	};
}

// Exportar builder para configuración personalizada si se requiere
export { AgentTemplateBuilder, templateBuilder };

// Exportar emitter para compatibilidad existente
// export { AgentEvents };

/**
 * IMPORT: funciones para manejar archivos MCP (importar/monitorizar).
 * - importMcpFile: valida mínima estructura y copia a carpeta mcp_imported del proyecto.
 * - watchMcpFolder: observa carpeta para nuevos .mcp.json y emite evento 'mcp:imported'.
 */

// Carpeta por defecto dentro del proyecto para MCP importados
const DEFAULT_MCP_FOLDER = process.env.MCP_IMPORTED_DIR ?? path.join(process.cwd(), 'mcp_imported');

/**
 * Validación ligera de un objeto MCP (presencia de campos clave).
 */
function isValidMcpPayload(obj: any): boolean {
	if (!obj || typeof obj !== 'object') return false;
	if (!obj.schemaVersion) return false;
	if (!obj.metadata || !obj.metadata.title) return false;
	if (!obj.content || typeof obj.content.cleaned !== 'string') return false;
	return true;
}

/**
 * Importa un archivo MCP JSON al proyecto:
 * - valida estructura mínima
 * - copia a carpeta mcp_imported con timestamp
 * - emite AgentEvents 'mcp:imported'
 * - retorna la ruta destino
 */
export async function importMcpFile(srcPath: string, destFolder: string = DEFAULT_MCP_FOLDER): Promise<string> {
	const absSrc = path.isAbsolute(srcPath) ? srcPath : path.resolve(process.cwd(), srcPath);
	try {
		const raw = await fs.readFile(absSrc, 'utf-8');
		const data = JSON.parse(raw);

		if (!isValidMcpPayload(data)) {
			Logger.warn('agentPromptInjector.importMcpFile.invalid_schema', { srcPath });
			throw new Error('MCP inválido: faltan campos requeridos (schemaVersion/metadata/content)');
		}

		await fs.mkdir(destFolder, { recursive: true });

		const baseName = path.basename(srcPath, path.extname(srcPath));
		const destName = `${baseName}.${Date.now()}.mcp.json`;
		const destPath = path.join(destFolder, destName);

		await fs.writeFile(destPath, JSON.stringify(data, null, 2), 'utf-8');

		// Emitir evento para que UI / Orchestrator lo indexe
		const correlationId = (Logger as any).getCorrelationId ? (Logger as any).getCorrelationId() : undefined;
		const payload = {
			path: destPath,
			metadata: data.metadata,
			importedAt: new Date().toISOString(),
			correlationId: correlationId ?? undefined,
		};
		AgentEvents.emit('mcp:imported', payload);
		Logger.info('agentPromptInjector.importMcpFile.success', { srcPath, destPath });

		return destPath;
	} catch (err) {
		Logger.error('agentPromptInjector.importMcpFile.error', { srcPath, error: (err as Error).message });
		throw err;
	}
}

/**
 * Observa una carpeta por nuevos archivos .mcp.json y los importa automáticamente.
 * Retorna una función para detener el watcher.
 */
export function watchMcpFolder(folder: string = DEFAULT_MCP_FOLDER): () => void {
	const absFolder = path.isAbsolute(folder) ? folder : path.resolve(process.cwd(), folder);

	(async () => {
		try {
			await fs.mkdir(absFolder, { recursive: true });
		} catch {
			/* ignore */
		}
	})();

	try {
		const watcher = chokidar.watch(absFolder, {
			ignored: /(^|[/\\])\../,
			persistent: true,
			awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
		});

		const onAdd = async (filePath: string) => {
			if (filePath.endsWith('.mcp.json')) {
				try {
					await importMcpFile(filePath, absFolder);
				} catch {
					// ya logueado en importMcpFile
				}
			}
		};

		watcher.on('add', onAdd);

		Logger.info('agentPromptInjector.watchMcpFolder.started', { folder: absFolder });

		return () => {
			watcher.off('add', onAdd);
			watcher.close();
			Logger.info('agentPromptInjector.watchMcpFolder.stopped', { folder: absFolder });
		};
	} catch (err) {
		Logger.error('agentPromptInjector.watchMcpFolder.error', { folder: absFolder, error: (err as Error).message });
		return () => {};
	}
}
