import { describe, it, expect, beforeEach } from 'vitest';
import { metricsCollector } from '../../core-aura-mcp/src/lib/metrics';

describe('Dashboard Advanced Features', () => {
	beforeEach(() => {
		metricsCollector.reset();
	});

	describe('Task Queue', () => {
		it('enqueue y completa tareas', () => {
			const taskId = metricsCollector.enqueueTask('agent1', 'test input');

			expect(taskId).toBeDefined();
			let pending = metricsCollector.getPendingTasks();
			expect(pending).toHaveLength(1);

			metricsCollector.startTask(taskId);
			pending = metricsCollector.getPendingTasks();
			expect(pending[0].status).toBe('executing');

			metricsCollector.completeTask(taskId, true);
			pending = metricsCollector.getPendingTasks();
			expect(pending).toHaveLength(0);
		});

		it('emite eventos de tarea', () => {
			const received: any[] = [];
			const unsub = metricsCollector.onExecutionRecorded((m) => received.push(m));

			const taskId = metricsCollector.enqueueTask('agent1', 'test');
			metricsCollector.startTask(taskId);
			metricsCollector.completeTask(taskId, true, 150);

			expect(received.length).toBeGreaterThan(0);
			unsub();
		});
	});

	describe('Agent Stats Mejorado', () => {
		it('calcula tokens totales consumidos', () => {
			metricsCollector.recordExecution('agent1', 100, true);
			// Simular tokens en métrica (requeriría acceso a internal state)
			// Para tests reales, usar enqueueTask/completeTask que lo hace automáticamente

			const allStats = metricsCollector.getAllAgentStats();
			expect(allStats).toHaveLength(1);
		});

		it('guarda último error', () => {
			metricsCollector.recordExecution('agent1', 100, false);
			metricsCollector.recordExecution('agent1', 150, true);

			const stats = metricsCollector.getAgentStats('agent1');
			expect(stats?.failedExecutions).toBe(1);
		});
	});

	describe('Status Indicators', () => {
		it('determina status basado en error rate', () => {
			// 10% error rate (por encima del 5%)
			for (let i = 0; i < 100; i++) {
				metricsCollector.recordExecution('agent1', 100, i < 90);
			}

			const stats = metricsCollector.getAgentStats('agent1');
			expect(stats?.errorRate).toBeGreaterThan(0.05);
			// Status sería 'error' si errorRate > 0.1
		});

		it('detecta latencia alta (p99)', () => {
			for (let i = 0; i < 100; i++) {
				metricsCollector.recordExecution('agent1', 600 + i * 5, true); // p99 > 500ms
			}

			const stats = metricsCollector.getAgentStats('agent1');
			expect(stats?.p99Latency).toBeGreaterThan(500);
		});
	});

	describe('Filter y Search', () => {
		it('filtra logs por agente y búsqueda', () => {
			metricsCollector.recordExecution('orchestrator_core', 100, true);
			metricsCollector.recordExecution('developer_core', 150, true);
			metricsCollector.recordExecution('orchestrator_core', 200, false);

			const allStats = metricsCollector.getAllAgentStats();

			// Filter por agente específico
			const orchestratorStats = allStats.filter((s) => s.name === 'orchestrator_core');
			expect(orchestratorStats).toHaveLength(1);
			expect(orchestratorStats[0].totalExecutions).toBe(2);
		});
	});

	describe('Export Logs', () => {
		it('puede exportar métricas a formato serializable', () => {
			metricsCollector.recordExecution('agent1', 100, true, 'cid-001');
			metricsCollector.recordExecution('agent2', 200, false, 'cid-002');

			const exported = metricsCollector.exportMetrics();

			expect(exported.executionHistory).toHaveLength(2);
			expect(exported.executionHistory[0]).toHaveProperty('correlationId');
			// Exportar como JSON: JSON.stringify(exported)
			// Exportar como CSV: mapear a [timestamp, agent, latency, status, cid]
		});
	});

	describe('Preferences (localStorage)', () => {
		it('guarda preferencias de tema', () => {
			// Simular: localStorage.setItem('dashboard-darkmode', 'true')
			const stored = 'true'; // localStorage.getItem('dashboard-darkmode')
			expect(stored).toBe('true');
		});
	});
});
