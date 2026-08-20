import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, AgentDefinition } from '../../core-aura-mcp/core/agentRegistry';

describe('AgentRegistry', () => {
	let registry: AgentRegistry;

	beforeEach(() => {
		registry = new AgentRegistry();
	});

	describe('register', () => {
		it('registra un agente correctamente', () => {
			const agent: AgentDefinition = { name: 'test_agent', version: '1.0' };
			registry.register(agent);

			expect(registry.get('test_agent')).toEqual(agent);
		});

		it('lanza error si se intenta registrar un agente sin nombre', () => {
			expect(() => registry.register({} as any)).toThrow('Invalid agent definition: missing name');
		});

		it('lanza error si se intenta registrar null', () => {
			expect(() => registry.register(null as any)).toThrow('Invalid agent definition: missing name');
		});

		it('lanza error si se intenta registrar undefined', () => {
			expect(() => registry.register(undefined as any)).toThrow('Invalid agent definition: missing name');
		});

		it('lanza error si se intenta registrar un agente duplicado', () => {
			const agent: AgentDefinition = { name: 'test_agent', version: '1.0' };
			registry.register(agent);

			expect(() => registry.register(agent)).toThrow('Agent test_agent already registered');
		});

		it('lanza error si se intenta registrar dos agentes con mismo nombre', () => {
			registry.register({ name: 'test' });
			expect(() => registry.register({ name: 'test' })).toThrow('Agent test already registered');
		});

		it('permite registrar agentes con versiones distintas pero mismo nombre base', () => {
			registry.register({ name: 'agent', version: '1.0' });
			// Mismo nombre lanza error
			expect(() => registry.register({ name: 'agent', version: '2.0' })).toThrow();
		});

		it('acepta agente con nombre vacío después de trim', () => {
			// edge case: nombre con solo espacios
			const agent = { name: '   ' };
			expect(() => registry.register(agent as any)).toThrow();
		});
	});

	describe('get', () => {
		it('retorna el agente registrado', () => {
			const agent: AgentDefinition = { name: 'orchestrator', version: '0.1.0' };
			registry.register(agent);

			const retrieved = registry.get('orchestrator');
			expect(retrieved).toEqual(agent);
		});

		it('retorna null si el agente no existe', () => {
			expect(registry.get('non_existent')).toBeNull();
		});

		it('es case-sensitive (busca por nombre exacto)', () => {
			registry.register({ name: 'Agent' });
			expect(registry.get('agent')).toBeNull();
			expect(registry.get('Agent')).toBeDefined();
		});

		it('retorna null si se busca con nombre vacío', () => {
			expect(registry.get('')).toBeNull();
		});

		it('retorna null si se busca con null', () => {
			expect(registry.get(null as any)).toBeNull();
		});
	});

	describe('list', () => {
		it('retorna lista vacía si no hay agentes', () => {
			expect(registry.list()).toEqual([]);
		});

		it('retorna todos los agentes registrados', () => {
			const agent1: AgentDefinition = { name: 'agent1', version: '1.0' };
			const agent2: AgentDefinition = { name: 'agent2', version: '2.0' };
			registry.register(agent1);
			registry.register(agent2);

			const list = registry.list();
			expect(list).toHaveLength(2);
			expect(list).toContainEqual(agent1);
			expect(list).toContainEqual(agent2);
		});

		it('retorna array nuevo (no referencia interna)', () => {
			registry.register({ name: 'agent1' });
			const list1 = registry.list();
			const list2 = registry.list();

			expect(list1).toEqual(list2);
			expect(list1).not.toBe(list2); // no es la misma referencia
		});

		it('modificar el array devuelto no afecta el registro interno', () => {
			registry.register({ name: 'agent1' });
			const list = registry.list();
			list.push({ name: 'fake' } as any);

			expect(registry.list()).toHaveLength(1);
		});
	});

	describe('unregister', () => {
		it('desregistra un agente y retorna true', () => {
			const agent: AgentDefinition = { name: 'test_agent', version: '1.0' };
			registry.register(agent);

			const result = registry.unregister('test_agent');
			expect(result).toBe(true);
			expect(registry.get('test_agent')).toBeNull();
		});

		it('retorna false si el agente no existe', () => {
			const result = registry.unregister('non_existent');
			expect(result).toBe(false);
		});

		it('no lanza error si se intenta desregistrar dos veces', () => {
			registry.register({ name: 'agent1' });
			registry.unregister('agent1');
			const result = registry.unregister('agent1');
			expect(result).toBe(false);
		});

		it('desregistra correctamente de una lista múltiple', () => {
			registry.register({ name: 'a' });
			registry.register({ name: 'b' });
			registry.register({ name: 'c' });

			registry.unregister('b');

			expect(registry.list().map((a) => a.name)).toEqual(['a', 'c']);
		});
	});

	describe('clear', () => {
		it('limpia todos los agentes', () => {
			registry.register({ name: 'agent1', version: '1.0' });
			registry.register({ name: 'agent2', version: '2.0' });

			registry.clear();

			expect(registry.list()).toEqual([]);
		});

		it('no lanza error si ya está vacío', () => {
			expect(() => registry.clear()).not.toThrow();
		});

		it('permite registrar agentes nuevamente después de clear', () => {
			registry.register({ name: 'agent1' });
			registry.clear();
			registry.register({ name: 'agent1' }); // debería permitir porque se limpió

			expect(registry.get('agent1')).toBeDefined();
		});

		it('limpia completamente (list, get, etc. vacíos)', () => {
			registry.register({ name: 'a' });
			registry.register({ name: 'b' });
			registry.clear();

			expect(registry.list()).toHaveLength(0);
			expect(registry.get('a')).toBeNull();
			expect(registry.get('b')).toBeNull();
		});
	});

	describe('concurrent operations', () => {
		it('maneja múltiples registros seguidos', () => {
			const agents = Array.from({ length: 10 }, (_, i) => ({ name: `agent-${i}` }));
			agents.forEach((a) => registry.register(a));

			expect(registry.list()).toHaveLength(10);
		});

		it('maneja mix de register/unregister/list', () => {
			registry.register({ name: 'a' });
			registry.register({ name: 'b' });
			expect(registry.list()).toHaveLength(2);

			registry.unregister('a');
			expect(registry.list()).toHaveLength(1);

			registry.register({ name: 'c' });
			expect(registry.list()).toHaveLength(2);
		});
	});
});
