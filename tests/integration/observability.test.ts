import { describe, it, expect, beforeEach } from 'vitest';
import { observabilityService } from '../../core-aura-mcp/src/lib/observability';

describe('Observability Service', () => {
	beforeEach(() => {
		observabilityService.reset();
	});

	describe('Traces', () => {
		it('crea y finaliza una traza', () => {
			const { traceId, endTrace } = observabilityService.createTrace('test-op', 'test-service');

			expect(traceId).toBeDefined();
			endTrace('success');

			const traces = observabilityService.getTraces();
			expect(traces).toHaveLength(1);
			expect(traces[0].operationName).toBe('test-op');
			expect(traces[0].status).toBe('success');
		});

		it('incluye correlationId en traces', () => {
			observabilityService.setCorrelationId('test-cid-123');

			const { endTrace } = observabilityService.createTrace('test-op', 'service');
			endTrace('success');

			const traces = observabilityService.getTraces();
			expect(traces[0].tags.correlationId).toBe('test-cid-123');

			observabilityService.popCorrelationId();
		});

		it('exporta traces en formato Jaeger', () => {
			const { endTrace } = observabilityService.createTrace('op1', 'service1');
			endTrace('success');

			const jaeger = observabilityService.exportTracesJaeger();
			expect(jaeger.spans).toHaveLength(1);
			expect(jaeger.spans[0].operationName).toBe('op1');
		});
	});

	describe('Metrics', () => {
		it('registra métrica', () => {
			observabilityService.recordMetric('latency', 150, 'ms');

			const metrics = observabilityService.getMetrics();
			expect(metrics).toHaveLength(1);
			expect(metrics[0].name).toBe('latency');
			expect(metrics[0].value).toBe(150);
		});

		it('exporta métricas en formato Prometheus', () => {
			observabilityService.recordMetric('latency', 100, 'ms');
			observabilityService.recordMetric('latency', 200, 'ms');
			observabilityService.recordMetric('errors', 5, 'count');

			const prom = observabilityService.exportMetricsPrometheus();
			expect(prom).toContain('latency_avg');
			expect(prom).toContain('errors');
		});
	});
});
