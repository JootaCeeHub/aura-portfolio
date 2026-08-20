import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildForAgent, AgentEvents, injectPrompt, injectPromptImmediate } from '../../core-aura-mcp/src/AgentPromptInjector';
import { Logger } from '../../core-aura-mcp/src/lib/logger';

describe('AgentPromptInjector Integration', () => {
	beforeEach(() => {
		Logger.clearMemoryLogs();
		Logger.addMemoryTransport();
	});

	afterEach(() => {
		Logger.clearMemoryLogs();
	});

	describe('buildForAgent con templates', () => {
		it('usa ORCHESTRATOR_TEMPLATE para agente orchestrator', async () => {
			const definition = { name: 'orchestrator' };
			const prompt = await buildForAgent(definition, { data: { activeAgents: 3 } });

			expect(prompt).toContain('ORCHESTRATOR');
			expect(prompt).toContain('coordinador central');
			expect(prompt).toContain('activeAgents');
		});

		it('usa DEVELOPER_TEMPLATE para agente developer', async () => {
			const definition = { name: 'developer' };
			const prompt = await buildForAgent(definition, { data: { language: 'typescript' } });

			expect(prompt).toContain('DEVELOPER_CORE');
			expect(prompt).toContain('código');
			expect(prompt).toContain('language');
		});

		it('usa TRADING_TEMPLATE para agente trading', async () => {
			const definition = { name: 'trading' };
			const prompt = await buildForAgent(definition, { data: { market: 'EURUSD' } });

			expect(prompt).toContain('TRADING_CORE');
			expect(prompt).toContain('sistemático');
			expect(prompt).toContain('riesgo');
		});

		it('usa ANALYST_TEMPLATE para agente analyst', async () => {
			const definition = { name: 'analyst' };
			const prompt = await buildForAgent(definition, { data: { dataset: 'sales' } });

			expect(prompt).toContain('ANALYST_CORE');
			expect(prompt).toContain('datos');
		});

		it('construye prompt custom si nombre no coincide', async () => {
			const definition = {
				name: 'custom_agent',
				persona: 'Mi persona',
				mission: 'Mi misión',
				tools: ['tool1', 'tool2'],
			};
			const prompt = await buildForAgent(definition);

			expect(prompt).toContain('Mi persona');
			expect(prompt).toContain('Mi misión');
			expect(prompt).toContain('tool1');
		});

		it('usa ruleComponents si se proporciona en definition custom', async () => {
			const definition = {
				name: 'custom',
				persona: 'Agent',
				mission: 'Do something',
				tools: [],
				ruleComponents: ['SECURITY', 'TESTING'],
			};
			const prompt = await buildForAgent(definition);

			expect(prompt).toContain('validar');
			expect(prompt).toContain('testing');
		});
	});

	describe('injectPrompt con correlationId', () => {
		it('injectPrompt captura correlationId desde Logger', async () => {
			const received: any[] = [];
			const unsub = AgentEvents.on('agent:promptInjected', (p) => received.push(p));

			const testCid = 'integration-test-cid';
			Logger.runWithId(testCid, async () => {
				await injectPrompt('agent1', 'test prompt');
			});

			// Esperar debounce
			await new Promise((r) => setTimeout(r, 250));

			expect(received.length).toBeGreaterThan(0);
			expect(received[0].correlationId).toBe(testCid);
			AgentEvents.off('agent:promptInjected', unsub);
		});

		it('injectPromptImmediate no espera debounce', async () => {
			const received: any[] = [];
			const unsub = AgentEvents.on('agent:promptInjected', (p) => received.push(p));

			Logger.runWithId('immediate-cid', async () => {
				await injectPromptImmediate('agent2', 'immediate prompt');
			});

			// Sin espera; inmediato
			expect(received.length).toBeGreaterThan(0);
			expect(received[0].agentId).toBe('agent2');
			AgentEvents.off('agent:promptInjected', unsub);
		});

		it('debounce acumula múltiples llamadas', async () => {
			const received: any[] = [];
			const unsub = AgentEvents.on('agent:promptInjected', (p) => received.push(p));

			// Múltiples llamadas rápidas
			await injectPrompt('agent3', 'prompt1');
			await injectPrompt('agent3', 'prompt2');
			await injectPrompt('agent3', 'prompt3');

			// Solo la última debería ser emitida (debounce)
			await new Promise((r) => setTimeout(r, 250));

			const agent3Events = received.filter((e) => e.agentId === 'agent3');
			expect(agent3Events).toHaveLength(1);
			expect(agent3Events[0].prompt).toBe('prompt3');

			AgentEvents.off('agent:promptInjected', unsub);
		});
	});

	describe('Logging integration', () => {
		it('registra construcción de prompts desde templates', async () => {
			await buildForAgent({ name: 'orchestrator' });

			const logs = Logger.getMemoryLogs();
			const buildLog = logs.find((l) => JSON.stringify(l).includes('fromTemplate'));
			expect(buildLog).toBeDefined();
		});

		it('registra construcción custom', async () => {
			await buildForAgent({
				name: 'custom',
				persona: 'P',
				mission: 'M',
				tools: [],
			});

			const logs = Logger.getMemoryLogs();
			const customLog = logs.find((l) => JSON.stringify(l).includes('custom'));
			expect(customLog).toBeDefined();
		});

		it('registra errores en construcción', async () => {
			try {
				await buildForAgent(null as any);
			} catch {
				// expected
			}

			const logs = Logger.getMemoryLogs();
			const errorLog = logs.find((l) => JSON.stringify(l).includes('error'));
			expect(errorLog).toBeDefined();
		});
	});
});
