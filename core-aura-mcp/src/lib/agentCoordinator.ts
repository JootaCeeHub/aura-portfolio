import { Logger } from './logger.js';
import { eventBus } from './eventBus.js';
import { metricsCollector } from './metrics.js';

/**
 * Definición de ejecución de tarea.
 */
export interface TaskExecution {
	taskId: string;
	agentId: string;
	input: string;
	status: 'pending' | 'executing' | 'completed' | 'failed';
	output?: string;
	error?: string;
	startTime: number;
	endTime?: number;
	latencyMs?: number;
	correlationId?: string;
}

/**
 * Coordinador de agentes que orquesta ejecuciones basado en eventos.
 * Desacoplado del resto del sistema vía EventBus.
 */
export class AgentCoordinator {
	private executions: Map<string, TaskExecution> = new Map();

	private maxExecutionsHistory = 10000;

	constructor() {
		Logger.debug('agentCoordinator.initialized');

		// Suscribirse a eventos de ejecución
		this.setupEventListeners();
	}

	/**
	 * Iniciar ejecución de tarea en un agente.
	 */
	async executeAgent(agentId: string, input: string, correlationId?: string): Promise<string> {
		const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const startTime = Date.now();

		// Crear registro de ejecución
		const execution: TaskExecution = {
			taskId,
			agentId,
			input,
			status: 'pending',
			startTime,
			correlationId,
		};
		this.executions.set(taskId, execution);

		try {
			// Publicar evento AgentExecutionStarted
			await eventBus.publishEvent({
				type: 'AgentExecutionStarted',
				agentId,
				taskId,
				input,
				timestamp: Date.now(),
				correlationId,
			});

			// Simular ejecución (en prod, llamar a agent real)
			execution.status = 'executing';
			const output = await this.simulateAgentExecution(agentId, input);

			// Actualizar ejecución
			execution.status = 'completed';
			execution.output = output;
			execution.endTime = Date.now();
			execution.latencyMs = Date.now() - startTime;

			// Publicar evento AgentExecutionCompleted
			await eventBus.publishEvent({
				type: 'AgentExecutionCompleted',
				agentId,
				taskId,
				output,
				latencyMs: execution.latencyMs,
				success: true,
				timestamp: Date.now(),
				correlationId,
			});

			// Registrar métrica
			metricsCollector.recordExecution(agentId, execution.latencyMs, true, correlationId);

			Logger.info('agentCoordinator.execution.completed', {
				taskId,
				agentId,
				latencyMs: execution.latencyMs,
			});

			return output;
		} catch (err) {
			execution.status = 'failed';
			execution.error = (err as Error).message;
			execution.endTime = Date.now();
			execution.latencyMs = Date.now() - startTime;

			// Publicar evento AgentExecutionFailed
			await eventBus.publishEvent({
				type: 'AgentExecutionFailed',
				agentId,
				taskId,
				error: execution.error,
				latencyMs: execution.latencyMs,
				timestamp: Date.now(),
				correlationId,
			});

			// Registrar métrica
			metricsCollector.recordExecution(agentId, execution.latencyMs, false, correlationId, undefined, execution.error);

			Logger.error('agentCoordinator.execution.failed', {
				taskId,
				agentId,
				error: execution.error,
			});

			throw err;
		}
	}

	/**
	 * Obtener ejecución por taskId.
	 */
	getExecution(taskId: string): TaskExecution | undefined {
		return this.executions.get(taskId);
	}

	/**
	 * Obtener ejecuciones de un agente.
	 */
	getExecutionsByAgent(agentId: string): TaskExecution[] {
		return Array.from(this.executions.values()).filter((e) => e.agentId === agentId);
	}

	/**
	 * Setup de listeners de eventos.
	 */
	private setupEventListeners(): void {
		// Logger escucha eventos de ejecución
		eventBus.subscribe('AgentExecutionStarted', (event: any) => {
			Logger.info('eventBus.AgentExecutionStarted', {
				taskId: event.taskId,
				agentId: event.agentId,
			});
		});

		eventBus.subscribe('AgentExecutionCompleted', (event: any) => {
			Logger.info('eventBus.AgentExecutionCompleted', {
				taskId: event.taskId,
				agentId: event.agentId,
				latencyMs: event.latencyMs,
			});
		});

		eventBus.subscribe('AgentExecutionFailed', (event: any) => {
			Logger.error('eventBus.AgentExecutionFailed', {
				taskId: event.taskId,
				agentId: event.agentId,
				error: event.error,
			});
		});
	}

	/**
	 * Simular ejecución de agente (stub para pruebas).
	 */
	private async simulateAgentExecution(agentId: string, input: string): Promise<string> {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(`[${agentId}] Processed: ${input}`);
			}, Math.random() * 200 + 50);
		});
	}

	/**
	 * Reset.
	 */
	reset(): void {
		this.executions.clear();
	}
}

export const agentCoordinator = new AgentCoordinator();

