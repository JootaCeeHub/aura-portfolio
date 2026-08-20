import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector, type ExecutionMetric, type GlobalMetrics } from '../../core-aura-mcp/src/lib/metrics';

describe('MetricsCollector', () => {
	let collector: MetricsCollector;

	beforeEach(() => {
		collector = new MetricsCollector();
	});

	describe('recordExecution', () => {
		it('registra una ejecución exitosa', () => {
			collector.recordExecution('agent1', 100, true);

			const stats = collector.getAgentStats('agent1');
			expect(stats).toBeDefined();
			expect(stats?.totalExecutions).toBe(1);
			expect(stats?.successfulExecutions).toBe(1);
			expect(stats?.failedExecutions).toBe(0);
		});

		it('registra una ejecución fallida', () => {
			collector.recordExecution('agent1', 100, false);

			const stats = collector.getAgentStats('agent1');
			expect(stats?.totalExecutions).toBe(1);
			expect(stats?.failedExecutions).toBe(1);
			expect(stats?.errorRate).toBe(1.0);
		});

		it('registra múltiples ejecuciones', () => {
			collector.recordExecution('agent1', 100, true);
			collector.recordExecution('agent1', 150, true);
			collector.recordExecution('agent1', 200, false);

			const stats = collector.getAgentStats('agent1');
			expect(stats?.totalExecutions).toBe(3);
			expect(stats?.successfulExecutions).toBe(2);
			expect(stats?.failedExecutions).toBe(1);
			expect(stats?.errorRate).toBeCloseTo(1 / 3);
		});

		it('calcula latencia promedio correctamente', () => {
			collector.recordExecution('agent1', 100, true);
			collector.recordExecution('agent1', 200, true);
			collector.recordExecution('agent1', 300, true);

			const stats = collector.getAgentStats('agent1');
			expect(stats?.averageLatency).toBe(200);
		});

		it('registra latencias min y max', () => {
			collector.recordExecution('agent1', 50, true);
			collector.recordExecution('agent1', 100, true);
			collector.recordExecution('agent1', 500, true);

			const stats = collector.getAgentStats('agent1');
			expect(stats?.minLatency).toBe(50);
			expect(stats?.maxLatency).toBe(500);
		});

		it('emite evento al registrar ejecución', () => {
			const received: ExecutionMetric[] = [];
			const unsub = collector.onExecutionRecorded((m) => received.push(m));

			collector.recordExecution('agent1', 100, true, 'cid-123');

			expect(received).toHaveLength(1);
			expect(received[0].agentName).toBe('agent1');
			expect(received[0].correlationId).toBe('cid-123');

			unsub();
		});
	});

	describe('getAgentStats', () => {
		it('retorna null si no hay ejecuciones', () => {
			const stats = collector.getAgentStats('nonexistent');
			expect(stats).toBeNull();
		});

		it('calcula percentiles correctamente', () => {
			const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
			latencies.forEach((lat) => {
				collector.recordExecution('agent1', lat, true);
			});

			const stats = collector.getAgentStats('agent1');
			expect(stats?.p50Latency).toBeGreaterThan(0);
			expect(stats?.p95Latency).toBeGreaterThan(stats?.p50Latency!);
			expect(stats?.p99Latency).toBeGreaterThan(stats?.p95Latency!);
		});

		it('filtra métricas por ventana temporal', () => {
			// Esta prueba es simplificada; en producción podrías mockear Date
			collector.recordExecution('agent1', 100, true);

			const stats = collector.getAgentStats('agent1');
			expect(stats?.totalExecutions).toBe(1);
		});
	});

	describe('getGlobalMetrics', () => {
		it('retorna métricas globales vacías inicialmente', () => {
			const metrics = collector.getGlobalMetrics();

			expect(metrics.totalExecutions).toBe(0);
			expect(metrics.totalErrors).toBe(0);
			expect(metrics.activeAgents).toBe(0);
		});

		it('agrega métricas de múltiples agentes', () => {
			collector.recordExecution('agent1', 100, true);
			collector.recordExecution('agent2', 150, false);
			collector.recordExecution('agent1', 200, true);

			const metrics = collector.getGlobalMetrics();

			expect(metrics.totalExecutions).toBe(3);
			expect(metrics.totalErrors).toBe(1);
			expect(metrics.activeAgents).toBe(2);
			expect(metrics.globalErrorRate).toBeCloseTo(1 / 3);
		});

		it('calcula error rate global correctamente', () => {
			for (let i = 0; i < 10; i++) {
				collector.recordExecution('agent1', 100, i < 8); // 8 exitosas, 2 fallidas
			}

			const metrics = collector.getGlobalMetrics();
			expect(metrics.globalErrorRate).toBeCloseTo(0.2);
		});
	});

	describe('getAllAgentStats', () => {
		it('retorna lista vacía si no hay agentes', () => {
			const stats = collector.getAllAgentStats();
			expect(stats).toEqual([]);
		});

		it('ordena agentes por número de ejecuciones (descendente)', () => {
			for (let i = 0; i < 5; i++) {
				collector.recordExecution('agent1', 100, true);
			}
			for (let i = 0; i < 10; i++) {
				collector.recordExecution('agent2', 100, true);
			}
			for (let i = 0; i < 3; i++) {
				collector.recordExecution('agent3', 100, true);
			}

			const stats = collector.getAllAgentStats();

			expect(stats).toHaveLength(3);
			expect(stats[0].name).toBe('agent2');
			expect(stats[1].name).toBe('agent1');
			expect(stats[2].name).toBe('agent3');
		});
	});

	describe('recordReconnectionAttempt', () => {
		it('registra intento de reconexión', () => {
			collector.recordReconnectionAttempt();

			const metrics = collector.getGlobalMetrics();
			expect(metrics.reconnectionAttempts).toBe(1);
		});

		it('incrementa contador con múltiples intentos', () => {
			collector.recordReconnectionAttempt();
			collector.recordReconnectionAttempt();
			collector.recordReconnectionAttempt();

			const metrics = collector.getGlobalMetrics();
			expect(metrics.reconnectionAttempts).toBe(3);
		});

		it('emite evento al registrar reconexión', () => {
			const received: any[] = [];
			const unsub = collector.onReconnectionAttempt((data) => received.push(data));

			collector.recordReconnectionAttempt();

			expect(received).toHaveLength(1);
			expect(received[0].attempt).toBe(1);

			unsub();
		});
	});

	describe('reset', () => {
		it('limpia todas las métricas', () => {
			collector.recordExecution('agent1', 100, true);
			collector.recordReconnectionAttempt();

			collector.reset();

			expect(collector.getAgentStats('agent1')).toBeNull();
			expect(collector.getGlobalMetrics().reconnectionAttempts).toBe(0);
			expect(collector.getAllAgentStats()).toEqual([]);
		});
	});

	describe('exportMetrics', () => {
		it('exporta métricas para persistencia', () => {
			collector.recordExecution('agent1', 100, true);

			const exported = collector.exportMetrics();

			expect(exported.executionHistory).toHaveLength(1);
			expect(exported.executionHistory[0].agentName).toBe('agent1');
		});
	});
});
