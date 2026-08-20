import { describe, it, expect, beforeEach } from 'vitest';
import {
	AgentTemplateBuilder,
	ORCHESTRATOR_TEMPLATE,
	DEVELOPER_TEMPLATE,
	PROMPT_FRAGMENTS,
} from '../../core-aura-mcp/core/agentTemplateBuilder';

describe('AgentTemplateBuilder - Extended Features', () => {
	let builder: AgentTemplateBuilder;

	beforeEach(() => {
		builder = new AgentTemplateBuilder();
	});

	describe('Slots (Placeholders)', () => {
		it('soporta slots en templates', () => {
			const template = {
				name: 'custom',
				persona: 'Agent',
				mission: 'Do {{action}}',
				tools: [],
				slots: {
					action: 'acción a realizar',
				},
			};

			builder.registerTemplate(template);
			const prompt = builder.buildFromTemplate('custom', undefined, undefined, {
				action: 'analyzeData',
			});

			expect(prompt).toContain('analyzeData');
			expect(prompt).not.toContain('{{action}}');
		});

		it('reemplaza múltiples slots', () => {
			const template = {
				name: 'multi',
				persona: '{{persona_name}}',
				mission: 'Analizar {{datatype}} en {{timeframe}}',
				tools: [],
				slots: {
					persona_name: 'Nombre del agente',
					datatype: 'Tipo de dato',
					timeframe: 'Marco temporal',
				},
			};

			builder.registerTemplate(template);
			const prompt = builder.buildFromTemplate('multi', undefined, undefined, {
				persona_name: 'DataBot',
				datatype: 'sales',
				timeframe: '2024',
			});

			expect(prompt).toContain('DataBot');
			expect(prompt).toContain('sales');
			expect(prompt).toContain('2024');
		});

		it('mantiene {{slot}} sin valor si no se proporciona', () => {
			const template = {
				name: 'partial',
				persona: 'Agent',
				mission: 'Task {{action}}',
				tools: [],
				slots: { action: 'desc' },
			};

			builder.registerTemplate(template);
			// Sin proporcionar slotValues
			const prompt = builder.buildFromTemplate('partial');

			// Mantiene placeholder si no se proporciona valor
			expect(prompt).toContain('{{action}}');
		});
	});

	describe('Template Inheritance', () => {
		beforeEach(() => {
			builder.registerTemplate(ORCHESTRATOR_TEMPLATE);
		});

		it('soporta herencia básica', () => {
			const child = {
				name: 'orchestrator_advanced',
				persona: 'Eres ORCHESTRATOR_ADVANCED',
				mission: ORCHESTRATOR_TEMPLATE.mission,
				tools: ['additional.tool'],
				inheritsFrom: 'orchestrator',
			};

			builder.registerTemplate(child);
			const resolved = builder.getTemplate('orchestrator_advanced');

			expect(resolved?.tools).toContain('agents.execute');
			expect(resolved?.tools).toContain('additional.tool');
		});

		it('override de propiedades en herencia', () => {
			const child = {
				name: 'custom_orchestrator',
				persona: 'Custom Persona',
				mission: 'Custom Mission',
				tools: [],
				inheritsFrom: 'orchestrator',
			};

			builder.registerTemplate(child);
			const resolved = builder.getTemplate('custom_orchestrator');

			expect(resolved?.persona).toBe('Custom Persona');
			expect(resolved?.mission).toBe('Custom Mission');
		});

		it('herencia múltiple niveles', () => {
			const level1 = {
				name: 'base',
				persona: 'Base',
				mission: 'Base Mission',
				tools: ['tool1'],
			};
			const level2 = {
				name: 'middle',
				persona: level1.persona,
				mission: level1.mission,
				tools: ['tool2'],
				inheritsFrom: 'base',
			};
			const level3 = {
				name: 'final',
				persona: 'Final',
				mission: level1.mission,
				tools: ['tool3'],
				inheritsFrom: 'middle',
			};

			builder.registerTemplate(level1);
			builder.registerTemplate(level2);
			builder.registerTemplate(level3);

			const resolved = builder.getTemplate('final');
			expect(resolved?.tools).toContain('tool1');
			expect(resolved?.tools).toContain('tool2');
			expect(resolved?.tools).toContain('tool3');
		});

		it('lanza error si parent no existe', () => {
			const child = {
				name: 'orphan',
				persona: 'P',
				mission: 'M',
				tools: [],
				inheritsFrom: 'non_existent',
			};

			expect(() => builder.registerTemplate(child)).toThrow('Parent template no encontrado');
		});
	});

	describe('Prompt Validation', () => {
		it('valida que prompt contiene reglas críticas', () => {
			const prompt = builder.buildPrompt('Agent', 'Mission', ['tool1']);

			expect(prompt).toContain('MUST');
			expect(prompt).toContain('NEVER');
		});

		it('advierte si faltan elementos críticos en prompt', () => {
			const template = {
				name: 'minimal',
				persona: 'Agent',
				mission: 'Do something',
				tools: [], // Sin herramientas (puede faltar "Herramientas" en output)
			};

			builder.registerTemplate(template);
			// Llamar buildFromTemplate no debería lanzar error, solo warn
			expect(() => builder.buildFromTemplate('minimal')).not.toThrow();
		});
	});

	describe('PROMPT_FRAGMENTS usage', () => {
		it('fragmentos están disponibles', () => {
			expect(PROMPT_FRAGMENTS.INSTRUCTIONS_HEADER).toBe('## Instrucciones');
			expect(PROMPT_FRAGMENTS.VALIDATION_INTRO).toBe('## Validación de Entrada');
		});

		it('se pueden componer manualmente con fragmentos', () => {
			const custom = `
${PROMPT_FRAGMENTS.INSTRUCTIONS_HEADER}
${PROMPT_FRAGMENTS.INSTRUCTIONS_PRIORITY}
${PROMPT_FRAGMENTS.INSTRUCTIONS_FORMAT}
${PROMPT_FRAGMENTS.INSTRUCTIONS_CONTEXT}
      `.trim();

			expect(custom).toContain('Instrucciones');
			expect(custom).toContain('claridad');
			expect(custom).toContain('formato');
		});
	});

	describe('Templates predefinidos mejorados', () => {
		it('ORCHESTRATOR_TEMPLATE incluye slots', () => {
			expect(ORCHESTRATOR_TEMPLATE.slots?.activeAgents).toBeDefined();
			expect(ORCHESTRATOR_TEMPLATE.slots?.maxConcurrent).toBeDefined();
		});

		it('DEVELOPER_TEMPLATE incluye slots', () => {
			expect(DEVELOPER_TEMPLATE.slots?.language).toBeDefined();
			expect(DEVELOPER_TEMPLATE.slots?.framework).toBeDefined();
		});

		it('prompts con slots reemplazan valores', async () => {
			builder.registerTemplate(ORCHESTRATOR_TEMPLATE);

			const prompt = builder.buildFromTemplate('orchestrator', undefined, undefined, {
				activeAgents: 'agent1, agent2, agent3',
				maxConcurrent: '5',
			});

			// Los slots deben estar documentados en el output
			expect(prompt).toContain('Parámetros Dinámicos');
		});
	});
});
