import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../../core-aura-mcp/src/mcpServer';
import { metricsCollector } from '../../core-aura-mcp/src/lib/metrics';

describe('Metrics Integration with MCP Server', () => {
	let serv: any;

	beforeAll(async () => {
		serv = await startServer({ port: 0, enableWs: true });
	});

	afterAll(async () => {
		await serv.close();
	});

	it('expone métricas vía API GET /api/metrics', async () => {
		metricsCollector.reset();
		metricsCollector.recordExecution('test_agent', 100, true);

		// Simular fetch a /api/metrics
		const response = await fetch(`http://127.0.0.1:${serv.port}/api/metrics`);
		const metrics = await response.json();

		expect(metrics.totalExecutions).toBe(1);
		expect(metrics.activeAgents).toBe(1);
	});

	it('expone métricas por agente vía API GET /api/metrics/agents/:name', async () => {
		metricsCollector.reset();
		metricsCollector.recordExecution('agent_x', 150, true);

		const response = await fetch(`http://127.0.0.1:${serv.port}/api/metrics/agents/agent_x`);
		const stats = await response.json();

		expect(stats.name).toBe('agent_x');
		expect(stats.totalExecutions).toBe(1);
	});

	it('expone alertas vía API GET /api/metrics/alerts', async () => {
		metricsCollector.reset();

		// Generar alertas
		for (let i = 0; i < 100; i++) {
			metricsCollector.recordExecution('agent_fail', 100, i < 90); // 10% error
		}

		const response = await fetch(`http://127.0.0.1:${serv.port}/api/metrics/alerts`);
		const alerts = await response.json();

		expect(Array.isArray(alerts)).toBe(true);
		expect(alerts.length).toBeGreaterThan(0);
	});

	it('exporta métricas completas vía API', async () => {
		metricsCollector.reset();
		metricsCollector.recordExecution('agent1', 100, true);

		const response = await fetch(`http://127.0.0.1:${serv.port}/api/metrics/export`);
		const exported = await response.json();

		expect(exported.executionHistory).toBeDefined();
		expect(exported.alerts).toBeDefined();
		expect(exported.globalStats).toBeDefined();
	});
});
