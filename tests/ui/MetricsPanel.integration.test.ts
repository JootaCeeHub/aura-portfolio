import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { metricsCollector } from '../../core-aura-mcp/src/lib/metrics';

describe('MetricsPanel Integration', () => {
	beforeEach(() => {
		metricsCollector.reset();
	});

	afterEach(() => {
		metricsCollector.reset();
	});

	it('muestra métricas globales correctamente', () => {
		// Simular ejecuciones
		metricsCollector.recordExecution('orchestrator', 100, true);
		metricsCollector.recordExecution('developer', 200, true);
		metricsCollector.recordExecution('trading', 150, false);

		const globalMetrics = metricsCollector.getGlobalMetrics();

		expect(globalMetrics.totalExecutions).toBe(3);
		expect(globalMetrics.totalErrors).toBe(1);
		expect(globalMetrics.activeAgents).toBe(3);
	});

	it('muestra estadísticas por agente', () => {
		// Simular ejecuciones para orchestrator
		for (let i = 0; i < 10; i++) {
			metricsCollector.recordExecution('orchestrator', 100 + i * 10, i < 9);
		}

		const allStats = metricsCollector.getAllAgentStats();

		expect(allStats).toHaveLength(1);
		expect(allStats[0].name).toBe('orchestrator');
		expect(allStats[0].totalExecutions).toBe(10);
		expect(allStats[0].successfulExecutions).toBe(9);
	});

	it('actualiza métricas en tiempo real', () => {
		metricsCollector.recordExecution('agent1', 100, true);
		let metrics = metricsCollector.getGlobalMetrics();
		expect(metrics.totalExecutions).toBe(1);

		metricsCollector.recordExecution('agent1', 100, true);
		metrics = metricsCollector.getGlobalMetrics();
		expect(metrics.totalExecutions).toBe(2);
	});

	it('mantiene historial para análisis', () => {
		const latencies = [100, 200, 150, 300, 250];
		latencies.forEach((lat) => {
			metricsCollector.recordExecution('agent1', lat, true);
		});

		const stats = metricsCollector.getAgentStats('agent1');
		expect(stats?.minLatency).toBe(100);
		expect(stats?.maxLatency).toBe(300);
		expect(stats?.p50Latency).toBeGreaterThan(0);
	});

	it('simula flujo completo de reconexión', () => {
		metricsCollector.recordExecution('orchestrator', 100, true);
		metricsCollector.recordReconnectionAttempt();
		metricsCollector.recordExecution('orchestrator', 150, true);
		metricsCollector.recordReconnectionAttempt();

		const globalMetrics = metricsCollector.getGlobalMetrics();

		expect(globalMetrics.totalExecutions).toBe(2);
		expect(globalMetrics.reconnectionAttempts).toBe(2);
		expect(globalMetrics.lastReconnect).toBeDefined();
	});
});
