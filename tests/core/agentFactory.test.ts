import { describe, it, expect } from 'vitest';
import { AgentFactory } from '../../core-aura-mcp/core/agentFactory';

describe('AgentFactory', () => {
	it('crea una instancia usando promptInjector y registry', async () => {
		const def = { name: 'testAgent', version: '1.0' };
		const registryMock = { get: (name: string) => (name === 'testAgent' ? def : null) };

		const logs: any[] = [];
		const loggerMock = {
			debug: (m: any, meta?: any) => logs.push({ level: 'debug', m, meta }),
			info: (m: any, meta?: any) => logs.push({ level: 'info', m, meta }),
			error: (m: any, meta?: any) => logs.push({ level: 'error', m, meta })
		};

		const promptInjectorMock = {
			buildForAgent: async (_d: any, _opts?: any) => 'PROMPT_CONTENT'
		};

		const factory = new AgentFactory(registryMock as any, loggerMock as any, promptInjectorMock as any);
		const instance = await factory.createAgent('testAgent', { user: 'johan' });

		expect(instance).toBeDefined();
		// instancia simulada tiene exec según factory placeholder
		expect(typeof instance.exec).toBe('function');
		expect(logs.some((l) => l.m.includes('created'))).toBe(true);
	});
});
