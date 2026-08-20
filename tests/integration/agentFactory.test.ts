import { describe, it, expect, beforeEach } from 'vitest';
import { agentFactory, FUTURE_AGENT_TEMPLATES } from '../../core-aura-mcp/src/lib/agentFactory';

describe('AgentFactory', () => {
	beforeEach(() => {
		agentFactory.reset();
	});

	describe('registerAgent', () => {
		it('registra un agente', () => {
			const agent = {
				id: 'test-agent',
				name: 'Test Agent',
				type: 'custom' as const,
				version: '1.0.0',
				description: 'Test',
				tools: ['tool1'],
				enabled: true,
			};

			agentFactory.registerAgent(agent);

			const retrieved = agentFactory.getAgent('test-agent');
			expect(retrieved).toEqual(agent);
		});

		it('lanza error si falta id o name', () => {
			expect(() =>
				agentFactory.registerAgent({
					id: 'test',
					name: '',
					type: 'custom',
					version: '1.0.0',
					description: '',
					tools: [],
					enabled: true,
				})
			).toThrow();
		});
	});

	describe('listAgents', () => {
		it('lista agentes registrados', () => {
			agentFactory.registerAgent({
				id: 'agent1',
				name: 'Agent 1',
				type: 'custom',
				version: '1.0.0',
				description: '',
				tools: [],
				enabled: true,
			});

			const agents = agentFactory.listAgents();
			expect(agents).toHaveLength(1);
		});

		it('filtra solo agentes habilitados', () => {
			agentFactory.registerAgent({
				id: 'enabled',
				name: 'Enabled',
				type: 'custom',
				version: '1.0.0',
				description: '',
				tools: [],
				enabled: true,
			});

			agentFactory.registerAgent({
				id: 'disabled',
				name: 'Disabled',
				type: 'custom',
				version: '1.0.0',
				description: '',
				tools: [],
				enabled: false,
			});

			const enabled = agentFactory.listAgents(true);
			expect(enabled).toHaveLength(1);
			expect(enabled[0].id).toBe('enabled');
		});
	});

	describe('Future agents', () => {
		it('obtiene templates de futuros agentes', () => {
			const templates = agentFactory.getFutureAgentTemplates();
			expect(templates.code_review).toBeDefined();
			expect(templates.test_generator).toBeDefined();
		});

		it('habilita un futuro agente', () => {
			agentFactory.enableFutureAgent('code_review');

			const agent = agentFactory.getAgent('code_review_agent');
			expect(agent).toBeDefined();
			expect(agent?.enabled).toBe(true);
		});

		it('lanza error si template no existe', () => {
			expect(() => agentFactory.enableFutureAgent('non_existent')).toThrow();
		});
	});
});
