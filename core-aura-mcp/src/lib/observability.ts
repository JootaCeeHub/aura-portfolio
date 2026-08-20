import { EventEmitter } from 'events';

import { Logger } from './logger.js';

/**
 * Evento de traza distribuida.
 */
export interface Trace {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	operationName: string;
	service: string;
	timestamp: number;
	durationMs: number;
	tags: Record<string, any>;
	status: 'success' | 'error';
	error?: string;
}

/**
 * Métrica observada.
 */
export interface Metric {
	name: string;
	value: number;
	unit: string;
	timestamp: number;
	tags: Record<string, any>;
}

/**
 * Servicio de observabilidad con soporte para traces distribuidos y métricas.
 * Exportable a OpenTelemetry, Jaeger, Prometheus, DataDog.
 */
export class ObservabilityService {
	private emitter = new EventEmitter();

	private traces: Trace[] = [];

	private metrics: Metric[] = [];

	private maxTracesSize = 10000;

	private maxMetricsSize = 5000;

	private correlationIdStack: string[] = [];

	constructor() {
		Logger.debug('observability.service.initialized');
	}

	/**
	 * Crear una nueva traza (span raíz).
	 */
	createTrace(operationName: string, service: string = 'aura-core', tags: Record<string, any> = {}): {
		traceId: string;
		spanId: string;
		endTrace: (status: 'success' | 'error', error?: string) => void;
	} {
		const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const spanId = `span-${Math.random().toString(36).slice(2, 9)}`;
		const startTime = Date.now();

		const endTrace = (status: 'success' | 'error', error?: string) => {
			const durationMs = Date.now() - startTime;
			const trace: Trace = {
				traceId,
				spanId,
				operationName,
				service,
				timestamp: startTime,
				durationMs,
				tags: {
					...tags,
					correlationId: this.getCurrentCorrelationId(),
				},
				status,
				error,
			};

			this.traces.push(trace);
			this.emitter.emit('trace:recorded', trace);

			if (this.traces.length > this.maxTracesSize) {
				this.traces.splice(0, Math.floor(this.maxTracesSize / 10));
			}

			Logger.debug('observability.trace.recorded', {
				traceId,
				operationName,
				durationMs,
				status,
			});
		};

		return { traceId, spanId, endTrace };
	}

	/**
	 * Registrar métrica.
	 */
	recordMetric(name: string, value: number, unit: string = 'ms', tags: Record<string, any> = {}): void {
		const metric: Metric = {
			name,
			value,
			unit,
			timestamp: Date.now(),
			tags: {
				...tags,
				correlationId: this.getCurrentCorrelationId(),
			},
		};

		this.metrics.push(metric);
		this.emitter.emit('metric:recorded', metric);

		if (this.metrics.length > this.maxMetricsSize) {
			this.metrics.splice(0, Math.floor(this.maxMetricsSize / 10));
		}
	}

	/**
	 * Establecer correlation ID.
	 */
	setCorrelationId(cid: string): void {
		this.correlationIdStack.push(cid);
	}

	/**
	 * Obtener correlation ID actual.
	 */
	getCurrentCorrelationId(): string | undefined {
		return this.correlationIdStack[this.correlationIdStack.length - 1];
	}

	/**
	 * Salir de correlation ID.
	 */
	popCorrelationId(): void {
		this.correlationIdStack.pop();
	}

	/**
	 * Exportar traces en formato Jaeger JSON.
	 */
	exportTracesJaeger() {
		return {
			traceID: this.traces[0]?.traceId || 'unknown',
			spans: this.traces.map((t) => ({
				traceID: t.traceId,
				spanID: t.spanId,
				operationName: t.operationName,
				startTime: t.timestamp,
				duration: t.durationMs * 1000, // microsegundos
				tags: t.tags,
				logs: t.error ? [{ timestamp: t.timestamp, fields: [{ key: 'error', value: t.error }] }] : [],
			})),
		};
	}

	/**
	 * Exportar métricas en formato Prometheus.
	 */
	exportMetricsPrometheus(): string {
		const lines: string[] = [];

		// Agrupar por métrica
		const grouped = new Map<string, Metric[]>();
		this.metrics.forEach((m) => {
			if (!grouped.has(m.name)) grouped.set(m.name, []);
			grouped.get(m.name)!.push(m);
		});

		// Generar líneas Prometheus
		grouped.forEach((metrics, name) => {
			const avg = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
			const max = Math.max(...metrics.map((m) => m.value));
			const min = Math.min(...metrics.map((m) => m.value));

			lines.push(`# HELP ${name} ${name} metric`);
			lines.push(`# TYPE ${name} gauge`);
			lines.push(`${name}_avg{unit="${metrics[0].unit}"} ${avg.toFixed(2)}`);
			lines.push(`${name}_max{unit="${metrics[0].unit}"} ${max}`);
			lines.push(`${name}_min{unit="${metrics[0].unit}"} ${min}`);
		});

		return lines.join('\n');
	}

	/**
	 * Suscribirse a traces.
	 */
	onTraceRecorded(cb: (trace: Trace) => void): () => void {
		this.emitter.on('trace:recorded', cb);
		return () => this.emitter.off('trace:recorded', cb);
	}

	/**
	 * Suscribirse a métricas.
	 */
	onMetricRecorded(cb: (metric: Metric) => void): () => void {
		this.emitter.on('metric:recorded', cb);
		return () => this.emitter.off('metric:recorded', cb);
	}

	/**
	 * Obtener todas las traces.
	 */
	getTraces(): Trace[] {
		return this.traces.slice();
	}

	/**
	 * Obtener todas las métricas.
	 */
	getMetrics(): Metric[] {
		return this.metrics.slice();
	}

	/**
	 * Reset.
	 */
	reset(): void {
		this.traces = [];
		this.metrics = [];
		this.correlationIdStack = [];
	}
}

export const observabilityService = new ObservabilityService();

