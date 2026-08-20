import { EventEmitter } from 'events';

import { Logger } from './logger.js';

/**
 * Métrica individual de ejecución.
 */
export interface ExecutionMetric {
	agentName: string;
	latencyMs: number;
	success: boolean;
	timestamp: number;
	correlationId?: string;
	tokensUsed?: number; // LLM tokens si aplica
	lastError?: string;
	errorMessage?: string;
}

/**
 * Estadísticas agregadas para un agente.
 */
export interface AgentStats {
	name: string;
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	errorRate: number;
	averageLatency: number;
	minLatency: number;
	maxLatency: number;
	p50Latency: number;
	p95Latency: number;
	p99Latency: number;
	lastUpdated: number;
	lastExecutionTime?: number; // timestamp
	lastError?: string;
	errorMessage?: string;
	memoryUsedTokens: number;
	lastSuccess?: boolean;
}

/**
 * Métricas globales del sistema.
 */
export interface GlobalMetrics {
	timestamp: number;
	totalExecutions: number;
	totalErrors: number;
	globalErrorRate: number;
	averageLatency: number;
	activeAgents: number;
	reconnectionAttempts: number;
	lastReconnect?: number;
}

/**
 * Alerta de métrica.
 */
export interface MetricAlert {
	id: string;
	timestamp: number;
	type: 'error_rate' | 'latency' | 'reconnection';
	severity: 'warning' | 'critical';
	message: string;
	agentName?: string;
	value: number;
	threshold: number;
}

export interface TaskQueueItem {
	id: string;
	agentName: string;
	input: string;
	createdAt: number;
	status: 'pending' | 'executing' | 'completed' | 'failed';
}

/**
 * Configuración de umbrales y alertas.
 */
export interface MetricsConfig {
	errorRateThreshold: number; // default 0.05 (5%)
	p99LatencyThreshold: number; // default 500ms
	enableAlerts: boolean;
	windowSizeMs: number; // ventana temporal para agregación
	maxHistorySize: number; // límite de métricas en memoria
}

/**
 * Recolector de métricas mejorado con alertas y historial temporal.
 */
export class MetricsCollector {
	private metricsEmitter = new EventEmitter();

	private executionHistory: ExecutionMetric[] = [];

	private agentStats: Map<string, ExecutionMetric[]> = new Map();

	private alerts: MetricAlert[] = [];

	private globalStats = {
		reconnectionAttempts: 0,
		lastReconnect: undefined as number | undefined,
		uptime: Date.now(),
	};

	private config: MetricsConfig = {
		errorRateThreshold: Number(process.env.METRICS_ERROR_RATE_THRESHOLD ?? 0.05),
		p99LatencyThreshold: Number(process.env.METRICS_P99_LATENCY_THRESHOLD ?? 500),
		enableAlerts: true,
		windowSizeMs: 5 * 60 * 1000,
		maxHistorySize: 10000,
	};

	private taskQueue: TaskQueueItem[] = [];
	private currentExecuting: Map<string, TaskQueueItem> = new Map();
	private requestsTimestamps: number[] = []; // para calcular req/s

	constructor(config?: Partial<MetricsConfig>) {
		this.config = { ...this.config, ...config };
		Logger.debug('metrics.collector.initialized', { config: this.config });
	}

	/**
	 * Calcular requests por segundo (ventana deslizante última minute).
	 */
	getRequestsPerSecond(): number {
		const now = Date.now();
		const oneMinuteAgo = now - 60 * 1000;

		// Limpiar timestamps antiguos
		this.requestsTimestamps = this.requestsTimestamps.filter((ts) => ts > oneMinuteAgo);

		if (this.requestsTimestamps.length === 0) return 0;
		return (this.requestsTimestamps.length / 60).toFixed(2) as any;
	}

	countTool(): void {
		this.requestsTimestamps.push(Date.now());
	}

	countIntent(): void {
		this.requestsTimestamps.push(Date.now());
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	countAgentCall(_agentName: string): void {
		this.requestsTimestamps.push(Date.now());
		// Optional: track specific agent call count if needed, for now just activity
	}

	/**
	 * Registrar ejecución (mejorado).
	 */
	recordExecution(
		agentName: string,
		latencyMs: number,
		success: boolean,
		correlationId?: string,
		tokensUsed?: number,
		errorMessage?: string,
	): void {
		const metric: ExecutionMetric = {
			agentName,
			latencyMs,
			success,
			timestamp: Date.now(),
			correlationId,
			tokensUsed,
			errorMessage,
		};

		this.executionHistory.push(metric);
		this.requestsTimestamps.push(Date.now());

		if (!this.agentStats.has(agentName)) {
			this.agentStats.set(agentName, []);
		}
		const agentMetrics = this.agentStats.get(agentName)!;
		agentMetrics.push(metric);

		this.pruneHistory();
		this.metricsEmitter.emit('execution:recorded', metric);

		if (this.config.enableAlerts) {
			this.validateAlerts(agentName);
		}

		Logger.debug('metrics.execution.recorded', {
			agentName,
			latencyMs,
			success,
			tokensUsed,
		});
	}

	/**
	 * Registrar intento de reconexión.
	 */
	recordReconnectionAttempt(): void {
		this.globalStats.reconnectionAttempts += 1;
		this.globalStats.lastReconnect = Date.now();

		this.metricsEmitter.emit('reconnection:attempt', {
			attempt: this.globalStats.reconnectionAttempts,
			timestamp: this.globalStats.lastReconnect,
		});

		// Alerta si hay muchos reintentos
		if (this.config.enableAlerts && this.globalStats.reconnectionAttempts > 3) {
			this.createAlert('reconnection', 'critical', `Excesivos intentos de reconexión: ${this.globalStats.reconnectionAttempts}`);
		}

		Logger.debug('metrics.reconnection.attempt', { attempts: this.globalStats.reconnectionAttempts });
	}

	/**
	 * Registrar tarea en cola.
	 */
	enqueueTask(agentName: string, input: string): string {
		const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const task: TaskQueueItem = {
			id,
			agentName,
			input,
			createdAt: Date.now(),
			status: 'pending',
		};
		this.taskQueue.push(task);
		this.metricsEmitter.emit('task:enqueued', task);
		Logger.debug('metrics.task.enqueued', { id, agentName });
		return id;
	}

	/**
	 * Marcar tarea como ejecutándose.
	 */
	startTask(taskId: string): void {
		const task = this.taskQueue.find((t) => t.id === taskId);
		if (task) {
			task.status = 'executing';
			this.currentExecuting.set(taskId, task);
			this.metricsEmitter.emit('task:started', task);
		}
	}

	/**
	 * Completar tarea.
	 */
	completeTask(taskId: string, success: boolean, tokensUsed?: number): void {
		const task = this.taskQueue.find((t) => t.id === taskId);
		if (task) {
			task.status = success ? 'completed' : 'failed';
			this.currentExecuting.delete(taskId);
			this.metricsEmitter.emit('task:completed', task);

			// Registrar ejecución con tokens
			this.recordExecution(task.agentName, Date.now() - task.createdAt, success, undefined);

			// Actualizar memoria
			const stats = this.agentStats.get(task.agentName);
			if (stats && stats.length > 0) {
				const lastMetric = stats[stats.length - 1] as ExecutionMetric & { tokensUsed?: number };
				if (tokensUsed) lastMetric.tokensUsed = tokensUsed;
			}
		}
	}

	/**
	 * Obtener estadísticas de un agente.
	 */
	getAgentStats(agentName: string): AgentStats | null {
		const metrics = this.agentStats.get(agentName);
		if (!metrics || metrics.length === 0) {
			return null;
		}

		const windowStart = Date.now() - this.config.windowSizeMs;
		const windowedMetrics = metrics.filter((m) => m.timestamp >= windowStart);

		if (windowedMetrics.length === 0) {
			return null;
		}

		const latencies = windowedMetrics.map((m) => m.latencyMs).sort((a, b) => a - b);
		const successful = windowedMetrics.filter((m) => m.success).length;
		const failed = windowedMetrics.length - successful;
		const errorRate = failed / windowedMetrics.length;

		return {
			name: agentName,
			totalExecutions: windowedMetrics.length,
			successfulExecutions: successful,
			failedExecutions: failed,
			errorRate,
			averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
			minLatency: latencies[0],
			maxLatency: latencies[latencies.length - 1],
			p50Latency: this.calculatePercentile(latencies, 0.5),
			p95Latency: this.calculatePercentile(latencies, 0.95),
			p99Latency: this.calculatePercentile(latencies, 0.99),
			lastUpdated: Date.now(),
			memoryUsedTokens: windowedMetrics.reduce((sum, m) => sum + (m.tokensUsed || 0), 0),
		};
	}

	/**
	 * Obtener métricas globales.
	 */
	getGlobalMetrics(): GlobalMetrics {
		const windowStart = Date.now() - this.config.windowSizeMs;
		const windowedMetrics = this.executionHistory.filter((m) => m.timestamp >= windowStart);

		const totalExecutions = windowedMetrics.length;
		const totalErrors = windowedMetrics.filter((m) => !m.success).length;
		const latencies = windowedMetrics.map((m) => m.latencyMs);
		const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
		const activeAgents = new Set(windowedMetrics.map((m) => m.agentName)).size;

		return {
			timestamp: Date.now(),
			totalExecutions,
			totalErrors,
			globalErrorRate: totalExecutions > 0 ? totalErrors / totalExecutions : 0,
			averageLatency: avgLatency,
			activeAgents,
			reconnectionAttempts: this.globalStats.reconnectionAttempts,
			lastReconnect: this.globalStats.lastReconnect,
		};
	}

	/**
	 * Listar todos los agentes.
	 */
	getAllAgentStats(): AgentStats[] {
		const stats: AgentStats[] = [];
		for (const agentName of this.agentStats.keys()) {
			const stat = this.getAgentStats(agentName);
			if (stat) stats.push(stat);
		}
		return stats.sort((a, b) => b.totalExecutions - a.totalExecutions);
	}

	/**
	 * Obtener cola de tareas pendientes.
	 */
	getPendingTasks(): TaskQueueItem[] {
		return this.taskQueue.filter((t) => t.status === 'pending' || t.status === 'executing');
	}

	/**
	 * Obtener tarea por ID.
	 */
	getTask(id: string): TaskQueueItem | undefined {
		return this.taskQueue.find((t) => t.id === id);
	}

	/**
	 * Obtener agente stats mejorado con tokens y último error.
	 */
	getAgentStatsEnhanced(agentName: string): (AgentStats & { lastSuccess?: boolean; lastError?: string }) | null {
		const stats = this.getAgentStats(agentName);
		if (!stats) return null;

		const metrics = this.agentStats.get(agentName) || [];
		const lastMetric = metrics[metrics.length - 1];
		const lastErrorMetric = [...metrics].reverse().find((m) => !m.success);
		const totalTokens = metrics.reduce((sum, m) => sum + ((m as ExecutionMetric).tokensUsed || 0), 0);

		return {
			...stats,
			lastExecutionTime: lastMetric?.timestamp,
			lastSuccess: lastMetric?.success,
			lastError: (lastErrorMetric as any)?.errorMessage,
			memoryUsedTokens: totalTokens,
		};
	}

	/**
	 * Obtener agentes por estado (para UI).
	 */
	getAgentsByState(): {
		healthy: AgentStats[];
		warning: AgentStats[];
		error: AgentStats[];
		idle: AgentStats[];
	} {
		const all = this.getAllAgentStats();
		const now = Date.now();

		return {
			healthy: all.filter((s) => s.errorRate < 0.05 && s.lastUpdated && now - s.lastUpdated < 60 * 1000),
			warning: all.filter((s) => s.errorRate >= 0.05 && s.errorRate < 0.1),
			error: all.filter((s) => s.errorRate >= 0.1),
			idle: all.filter((s) => !s.lastUpdated || now - s.lastUpdated >= 5 * 60 * 1000),
		};
	}

	/**
	 * Obtener alertas activas.
	 */
	getAlerts(since?: number): MetricAlert[] {
		if (!since) {
			return this.alerts.slice();
		}
		return this.alerts.filter((a) => a.timestamp >= since);
	}

	/**
	 * Crear alerta.
	 */
	private createAlert(
		type: MetricAlert['type'],
		severity: MetricAlert['severity'],
		message: string,
		value: number = 0,
		threshold: number = 0,
		agentName?: string,
	): void {
		const alert: MetricAlert = {
			id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			timestamp: Date.now(),
			type,
			severity,
			message,
			agentName,
			value,
			threshold,
		};

		this.alerts.push(alert);
		this.metricsEmitter.emit('alert:created', alert);

		Logger.warn('metrics.alert.created', { type, severity, message });
	}

	/**
	 * Validar alertas basado en umbrales.
	 */
	private validateAlerts(agentName: string): void {
		const stats = this.getAgentStats(agentName);
		if (!stats) return;

		// Alerta por error rate
		if (stats.errorRate > this.config.errorRateThreshold && stats.totalExecutions > 10) {
			this.createAlert(
				'error_rate',
				stats.errorRate > this.config.errorRateThreshold * 2 ? 'critical' : 'warning',
				`Error rate alto para ${agentName}`,
				stats.errorRate,
				this.config.errorRateThreshold,
				agentName,
			);
		}

		// Alerta por latencia p99
		if (stats.p99Latency > this.config.p99LatencyThreshold && stats.totalExecutions > 10) {
			this.createAlert(
				'latency',
				stats.p99Latency > this.config.p99LatencyThreshold * 1.5 ? 'critical' : 'warning',
				`Latencia p99 alta para ${agentName}`,
				stats.p99Latency,
				this.config.p99LatencyThreshold,
				agentName,
			);
		}
	}

	/**
	 * Suscribirse a eventos.
	 */
	onExecutionRecorded(cb: (metric: ExecutionMetric) => void): () => void {
		this.metricsEmitter.on('execution:recorded', cb);
		return () => {
			this.metricsEmitter.off('execution:recorded', cb);
		};
	}

	onReconnectionAttempt(cb: (data: any) => void): () => void {
		this.metricsEmitter.on('reconnection:attempt', cb);
		return () => {
			this.metricsEmitter.off('reconnection:attempt', cb);
		};
	}

	onAlertCreated(cb: (alert: MetricAlert) => void): () => void {
		this.metricsEmitter.on('alert:created', cb);
		return () => {
			this.metricsEmitter.off('alert:created', cb);
		};
	}

	/**
	 * Resetear.
	 */
	reset(): void {
		this.executionHistory = [];
		this.agentStats.clear();
		this.alerts = [];
		this.globalStats = { reconnectionAttempts: 0, lastReconnect: undefined, uptime: Date.now() };
		Logger.info('metrics.collector.reset');
	}

	/**
	 * Exportar.
	 */
	exportMetrics(): any {
		return {
			executionHistory: this.executionHistory.slice(),
			agentStats: Object.fromEntries(this.agentStats),
			alerts: this.alerts.slice(),
			globalStats: { ...this.globalStats },
		};
	}

	private calculatePercentile(sortedArray: number[], percentile: number): number {
		if (sortedArray.length === 0) return 0;
		const index = Math.ceil(sortedArray.length * percentile) - 1;
		return sortedArray[Math.max(0, index)];
	}

	private pruneHistory(): void {
		if (this.executionHistory.length > this.config.maxHistorySize) {
			const toRemove = this.executionHistory.length - this.config.maxHistorySize;
			this.executionHistory.splice(0, toRemove);
			for (const metrics of this.agentStats.values()) {
				if (metrics.length > this.config.maxHistorySize / this.agentStats.size) {
					metrics.splice(0, toRemove / this.agentStats.size);
				}
			}
			Logger.debug('metrics.pruned', { removed: toRemove });
		}
	}
}

export const metricsCollector = new MetricsCollector();

