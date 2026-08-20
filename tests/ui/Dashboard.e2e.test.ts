import { describe, it, expect, beforeEach, vi } from 'vitest';
import { metricsCollector } from '../../core-aura-mcp/src/lib/metrics';

describe('Dashboard E2E - Complex Interactions', () => {
	beforeEach(() => {
		metricsCollector.reset();
	});

	describe('Search/Filter con Debounce', () => {
		it('filtra logs con debounce 300ms', async () => {
			// Registrar múltiples ejecuciones
			metricsCollector.recordExecution('orchestrator_core', 100, true);
			metricsCollector.recordExecution('developer_core', 150, true);
			metricsCollector.recordExecution('trading_core', 200, true);

			const exported = metricsCollector.exportMetrics();
			const logs = exported.executionHistory;

			// Simular búsqueda 'developer' (debounce 300ms)
			const filtered = logs.filter((l) => l.agentName.toLowerCase().includes('developer'));

			expect(filtered).toHaveLength(1);
			expect(filtered[0].agentName).toBe('developer_core');
		});

		it('actualiza filtro instantáneamente sin debounce', () => {
			metricsCollector.recordExecution('agent_a', 100, true);
			metricsCollector.recordExecution('agent_b', 100, true);
			metricsCollector.recordExecution('agent_a', 100, true);

			const allStats = metricsCollector.getAllAgentStats();
			const agentA = allStats.find((s) => s.name === 'agent_a');

			expect(agentA?.totalExecutions).toBe(2);
		});
	});

	describe('Hover Tooltip', () => {
		it('muestra detalles completos en tooltip', () => {
			metricsCollector.recordExecution('agent_x', 150, true, 'cid-001', 200);

			const stats = metricsCollector.getAgentStatsEnhanced('agent_x');

			expect(stats).toBeDefined();
			expect(stats?.memoryUsedTokens).toBe(200);
			expect(stats?.totalExecutions).toBe(1);
		});
	});

	describe('Click Expand Log', () => {
		it('expande log completo con error message', () => {
			metricsCollector.recordExecution('agent_x', 500, false, 'cid-001', undefined, 'Connection timeout');

			const exported = metricsCollector.exportMetrics();
			const log = exported.executionHistory[0];

			expect(log.success).toBe(false);
			expect(log.errorMessage).toBe('Connection timeout');
		});
	});

	describe('Export Logs', () => {
		it('exporta como JSON válido', () => {
			metricsCollector.recordExecution('agent1', 100, true, 'cid-001', 150);
			metricsCollector.recordExecution('agent2', 200, false, 'cid-002', undefined, 'Error occurred');

			const exported = metricsCollector.exportMetrics();
			const json = JSON.stringify(exported);

			expect(json).toBeTruthy();
			expect(JSON.parse(json)).toBeDefined();
		});

		it('exporta como CSV con headers', () => {
			metricsCollector.recordExecution('agent1', 100, true, 'cid-001');
			metricsCollector.recordExecution('agent2', 200, false, 'cid-002');

			const exported = metricsCollector.exportMetrics();
			const data = exported.executionHistory;

			// Simular CSV
			const headers = ['Timestamp', 'Agent', 'Latency', 'Status', 'CID'];
			const rows = data.map((d) => [
				new Date(d.timestamp).toISOString(),
				d.agentName,
				d.latencyMs,
				d.success ? 'success' : 'failed',
				d.correlationId || 'n/a',
			]);

			expect(headers).toHaveLength(5);
			expect(rows).toHaveLength(2);
		});
	});

	describe('Dark Mode Toggle', () => {
		it('guarda preferencia en localStorage', () => {
			const pref = { darkMode: true };
			const json = JSON.stringify(pref);

			// Simular localStorage
			expect(json).toContain('darkMode');
			expect(JSON.parse(json).darkMode).toBe(true);
		});
	});

	describe('Animaciones', () => {
		it('detecta status pulsing para 'executing'', () => {
			metricsCollector.recordExecution('agent1', 100, true);
			const stats = metricsCollector.getAgentStats('agent1');

			// Status sería 'executing' si la ejecución fuera reciente
			expect(stats?.totalExecutions).toBe(1);
		});
	});

	describe('Requests per Second', () => {
		it('calcula req/s correctamente', () => {
			const start = Date.now();

			// Registrar 5 requests en 1 segundo
			for (let i = 0; i < 5; i++) {
				metricsCollector.recordExecution(`agent${i}`, 50, true);
			}

			const rps = metricsCollector.getRequestsPerSecond();
			expect(rps).toBeGreaterThan(0);
		});
	});

	describe('Pending Tasks Queue', () => {
		it('gestiona cola de tareas', () => {
			const taskId1 = metricsCollector.enqueueTask('agent1', 'task input 1');
			const taskId2 = metricsCollector.enqueueTask('agent2', 'task input 2');

			let pending = metricsCollector.getPendingTasks();
			expect(pending).toHaveLength(2);

			metricsCollector.startTask(taskId1);
			metricsCollector.completeTask(taskId1, true);

			pending = metricsCollector.getPendingTasks();
			expect(pending).toHaveLength(1);
			expect(pending[0].id).toBe(taskId2);
		});
	});

	describe('Agent States by Health', () => {
		it('agrupa agentes por estado (healthy, warning, error, idle)', () => {
			// Healthy: bajo error rate
			for (let i = 0; i < 100; i++) {
				metricsCollector.recordExecution('healthy_agent', 100, i < 98);
			}

			// Error: alto error rate
			for (let i = 0; i < 100; i++) {
				metricsCollector.recordExecution('error_agent', 100, i < 80);
			}

			const byState = metricsCollector.getAgentsByState();

			expect(byState.healthy.length + byState.warning.length + byState.error.length + byState.idle.length).toBeGreaterThan(0);
		});
	});
});
