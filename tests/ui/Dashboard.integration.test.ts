import { describe, it, expect, beforeEach } from 'vitest';
import { metricsCollector } from '../../core-aura-mcp/src/lib/metrics';

describe('Dashboard Integration', () => {
	beforeEach(() => {
		metricsCollector.reset();
	});

	it('CoreStatusPanel muestra métricas globales', () => {
		// Simular ejecuciones
		metricsCollector.recordExecution('orchestrator', 100, true);
		metricsCollector.recordExecution('developer', 200, true);

		const metrics = metricsCollector.getGlobalMetrics();

		expect(metrics.totalExecutions).toBe(2);
		expect(metrics.activeAgents).toBe(2);
		expect(metrics.averageLatency).toBe(150);
	});

	it('AgentOrchestrationMap lista agentes activos', () => {
		metricsCollector.recordExecution('orchestrator_core', 100, true);
		metricsCollector.recordExecution('developer_core', 150, true);
		metricsCollector.recordExecution('trading_core', 200, false);

		const allStats = metricsCollector.getAllAgentStats();

		expect(allStats).toHaveLength(3);
		expect(allStats.map((s) => s.name)).toContain('orchestrator_core');
	});

	it('RecentExecutions captura últimas ejecuciones con correlationId', () => {
		const cid1 = 'cid-001';
		const cid2 = 'cid-002';

		metricsCollector.recordExecution('agent1', 100, true, cid1);
		metricsCollector.recordExecution('agent2', 200, false, cid2);

		const metrics = metricsCollector.exportMetrics();

		expect(metrics.executionHistory).toHaveLength(2);
		expect(metrics.executionHistory[0].correlationId).toBe(cid1);
		expect(metrics.executionHistory[1].correlationId).toBe(cid2);
	});

	it('LogsTimeline filtra por agente', () => {
		metricsCollector.recordExecution('orchestrator', 100, true);
		metricsCollector.recordExecution('developer', 150, true);
		metricsCollector.recordExecution('orchestrator', 200, false);

		const allStats = metricsCollector.getAllAgentStats();
		const orchestratorStats = allStats.find((s) => s.name === 'orchestrator');

		expect(orchestratorStats?.totalExecutions).toBe(2);
		expect(orchestratorStats?.successfulExecutions).toBe(1);
	});

	it('Dashboard responde a eventos en tiempo real', async () => {
		const received: any[] = [];
		const unsub = metricsCollector.onExecutionRecorded((metric) => {
			received.push(metric);
		});

		metricsCollector.recordExecution('agent1', 100, true, 'cid-123');

		expect(received).toHaveLength(1);
		expect(received[0].agentName).toBe('agent1');

		unsub();
	});

	it('Dashboard maneja alertas y las muestra', () => {
		const alerts: any[] = [];
		const unsub = metricsCollector.onAlertCreated((alert) => {
			alerts.push(alert);
		});

		// Generar alertas: 10% error rate (por encima del 5% threshold)
		for (let i = 0; i < 100; i++) {
			metricsCollector.recordExecution('failing_agent', 100, i < 90);
		}

		expect(alerts.length).toBeGreaterThan(0);
		expect(alerts[0].type).toBe('error_rate');

		unsub();
	});
});
