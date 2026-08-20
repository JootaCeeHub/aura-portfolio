import { describe, it, expect } from 'vitest';
import { AgentManager } from '../../core-aura-mcp/core/agentManager';
import { AgentFactory } from '../../core-aura-mcp/core/agentFactory';
import { AgentRegistry } from '../../core-aura-mcp/core/agentRegistry';

describe('AgentManager', () => {
	it('registra agentes y crea instancias via factory', async () => {
		const registry = new AgentRegistry();
		const logs: any[] = [];
		const loggerMock = { debug: (_: any, __?: any) => {}, info: (_: any, __?: any) => {}, warn: (_: any, __?: any) => {} };

		// mock factory que crea una instancia simple
		const factoryMock = {
			createAgent: async (name: string) => ({ name, exec: async (input: any) => ({ ok: true, input }) })
		} as unknown as AgentFactory;

		const manager = new AgentManager({ registry, factory: factoryMock, logger: loggerMock as any });

		// registrar y verificar
		manager.register({ name: 'alpha' });
		manager.registerAll([{ name: 'beta' }, { name: 'beta' }]); // duplicate ignored with warn

		const defs = manager.listDefinitions();
		expect(defs.map((d) => d.name).sort()).toEqual(['alpha', 'beta']);

		// crear instancia via factory inyectada
		const inst = await manager.create('alpha', { ctx: true });
		expect(inst).toBeDefined();
		expect(typeof inst.exec).toBe('function');
	});
});
