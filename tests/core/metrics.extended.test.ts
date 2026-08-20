import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../core-aura-mcp/src/lib/metrics';

describe('MetricsCollector - Alerts & Thresholds', () => {
	let collector: MetricsCollector;

	beforeEach(() => {
		collector = new MetricsCollector({
			errorRateThreshold: 0.05,
			p99LatencyThreshold: 500,
			enableAlerts: true,
		});
	});

	describe('Alertas por error rate', () => {
		it('crea alerta si error rate excede threshold', () => {
			const received: any[] = [];
			const unsub = collector.onAlertCreated((alert) => received.push(alert));

			// Registrar 100 ejecuciones con 10% de error (por encima del 5% threshold)
			for (let i = 0; i < 100; i++) {
				collector.recordExecution('agent1', 100, i < 90);
			}

			expect(received.length).toBeGreaterThan(0);
			expect(received[0].type).toBe('error_rate');
			expect(received[0].severity).toBe('warning');

			unsub();
		});

		it('crea alerta crítica si error rate es el doble del threshold', () => {
			const received: any[] = [];
			const unsub = collector.onAlertCreated((alert) => received.push(alert));

			// Registrar 100 ejecuciones con 10% de error (doble del 5% threshold)
			for (let i = 0; i < 100; i++) {
				collector.recordExecution('agent1', 100, i < 90);
			}

			const criticalAlert = received.find((a) => a.severity === 'critical');
			expect(criticalAlert).toBeDefined();

			unsub();
		});
	});

	describe('Alertas por latencia', () => {
		it('crea alerta si p99 latency excede threshold', () => {
			const received: any[] = [];
			const unsub = collector.onAlertCreated((alert) => received.push(alert));

			// Registrar 100 ejecuciones con latencias altas (por encima del 500ms threshold)
			for (let i = 0; i < 100; i++) {
				collector.recordExecution('agent1', 600 + i * 10, true); // todas exitosas pero lentas
			}

			const latencyAlert = received.find((a) => a.type === 'latency');
			expect(latencyAlert).toBeDefined();

			unsub();
		});
	});

	describe('Alertas por reconexión', () => {
		it('crea alerta si hay muchos intentos de reconexión', () => {
			const received: any[] = [];
			const unsub = collector.onAlertCreated((alert) => received.push(alert));

			for (let i = 0; i < 5; i++) {
				collector.recordReconnectionAttempt();
			}

			const reconnectAlert = received.find((a) => a.type === 'reconnection');
			expect(reconnectAlert).toBeDefined();

			unsub();
		});
	});

	describe('getAlerts', () => {
		it('retorna todas las alertas si no se proporciona since', () => {
			collector.recordReconnectionAttempt();
			collector.recordReconnectionAttempt();
			collector.recordReconnectionAttempt();

			const allAlerts = collector.getAlerts();
			expect(allAlerts.length).toBeGreaterThan(0);
		});

		it('filtra alertas por timestamp', () => {
			collector.recordReconnectionAttempt();

			const beforeNow = Date.now();
			// esperar un poco
			// eslint-disable-next-line no-promise-executor-return
			const alerts = collector.getAlerts(beforeNow + 1);
			expect(alerts).toEqual([]);
		});
	});

	describe('Configuración personalizada', () => {
		it('respeta thresholds configurados', () => {
			const custom = new MetricsCollector({
				errorRateThreshold: 0.1, // 10%
				p99LatencyThreshold: 1000, // 1s
			});

			const received: any[] = [];
			const unsub = custom.onAlertCreated((alert) => received.push(alert));

			// 9% error rate (por debajo del 10% threshold) - no debe alertar
			for (let i = 0; i < 100; i++) {
				custom.recordExecution('agent1', 100, i < 91);
			}

			const errorAlerts = received.filter((a) => a.type === 'error_rate');
			expect(errorAlerts).toEqual([]);

			unsub();
		});

		it('desactiva alertas si enableAlerts es false', () => {
			const noAlerts = new MetricsCollector({ enableAlerts: false });

			const received: any[] = [];
			const unsub = noAlerts.onAlertCreated((alert) => received.push(alert));

			// 10% error rate (por encima del threshold) pero alertas deshabilitadas
			for (let i = 0; i < 100; i++) {
				noAlerts.recordExecution('agent1', 100, i < 90);
			}

			expect(received).toEqual([]);

			unsub();
		});
	});

	describe('exportMetrics', () => {
		it('incluye alertas en export', () => {
			for (let i = 0; i < 100; i++) {
				collector.recordExecution('agent1', 100, i < 90);
			}

			const exported = collector.exportMetrics();

			expect(exported.alerts).toBeDefined();
			expect(Array.isArray(exported.alerts)).toBe(true);
		});
	});
});
