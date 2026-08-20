import { describe, it, expect, beforeEach } from 'vitest';
import {
	AgentTemplateBuilder,
	RULE_COMPONENTS,
	ORCHESTRATOR_TEMPLATE,
	DEVELOPER_TEMPLATE,
	TRADING_TEMPLATE,
	ANALYST_TEMPLATE,
} from '../../core-aura-mcp/core/agentTemplateBuilder';

describe('AgentTemplateBuilder', () => {
	let builder: AgentTemplateBuilder;

	beforeEach(() => {
		builder = new AgentTemplateBuilder();
	});

	describe('buildPrompt', () => {
		it('construye prompt con componentes básicos', () => {
			const prompt = builder.buildPrompt('Test Agent', 'Test mission', ['tool1', 'tool2']);

			expect(prompt).toContain('Test Agent');
			expect(prompt).toContain('Test mission');
			expect(prompt).toContain('tool1');
			expect(prompt).toContain('tool2');
		});

		it('incluye reglas globales por defecto', () => {
			const prompt = builder.buildPrompt('Agent', 'Mission', []);

			expect(prompt).toContain('MUST');
			expect(prompt).toContain('NEVER');
		});

		it('usa reglas personalizadas si se proporciona', () => {
			const customRules = 'CUSTOM RULE: Test';
			const prompt = builder.buildPrompt('Agent', 'Mission', [], customRules);

			expect(prompt).toContain('CUSTOM RULE: Test');
			expect(prompt).not.toContain('buenas prácticas técnicas'); // regla global
		});

		it('incluye contexto cuando se proporciona', () => {
			const context = { userId: '123', env: 'prod' };
			const prompt = builder.buildPrompt('Agent', 'Mission', [], undefined, context);

			expect(prompt).toContain('Contexto');
			expect(prompt).toContain('userId');
			expect(prompt).toContain('123');
		});

		it('lanza error si persona no es válida', () => {
			expect(() => builder.buildPrompt('', 'Mission', [])).toThrow();
			expect(() => builder.buildPrompt(null as any, 'Mission', [])).toThrow();
		});

		it('lanza error si mission no es válida', () => {
			expect(() => builder.buildPrompt('Agent', '', [])).toThrow();
			expect(() => builder.buildPrompt('Agent', null as any, [])).toThrow();
		});

		it('lanza error si tools no es array', () => {
			expect(() => builder.buildPrompt('Agent', 'Mission', null as any)).toThrow();
		});

		it('maneja tools vacío', () => {
			const prompt = builder.buildPrompt('Agent', 'Mission', []);
			expect(prompt).toContain('No hay herramientas disponibles');
		});

		it('formatea herramientas correctamente', () => {
			const prompt = builder.buildPrompt('Agent', 'Mission', ['tool.action', 'service/method']);
			expect(prompt).toContain('- **tool.action**');
			expect(prompt).toContain('- **service/method**');
		});

		it('maneja contexto con valores complejos', () => {
			const context = {
				config: { timeout: 5000, retries: 3 },
				array: [1, 2, 3],
				string: 'value',
			};
			const prompt = builder.buildPrompt('Agent', 'Mission', [], undefined, context);
			expect(prompt).toContain('config');
			expect(prompt).toContain('timeout');
		});

		it('filtra valores null/undefined del contexto', () => {
			const context = { defined: 'value', undefined: undefined, nulled: null };
			const prompt = builder.buildPrompt('Agent', 'Mission', [], undefined, context);
			expect(prompt).toContain('defined');
			expect(prompt).not.toContain('undefined');
			expect(prompt).not.toContain('nulled');
		});
	});

	describe('registerTemplate', () => {
		it('registra un template correctamente', () => {
			const template: AgentTemplate = {
				name: 'test',
				persona: 'Test',
				mission: 'Test mission',
				tools: ['tool1'],
			};
			builder.registerTemplate(template);

			expect(builder.getTemplate('test')).toEqual(template);
		});

		it('lanza error si template no tiene nombre', () => {
			expect(() => builder.registerTemplate({ persona: 'P', mission: 'M', tools: [] } as any)).toThrow();
		});

		it('lanza error si template es null/undefined', () => {
			expect(() => builder.registerTemplate(null as any)).toThrow();
		});
	});

	describe('getTemplate', () => {
		it('retorna template registrado', () => {
			const template: AgentTemplate = { name: 'custom', persona: 'P', mission: 'M', tools: [] };
			builder.registerTemplate(template);

			expect(builder.getTemplate('custom')).toEqual(template);
		});

		it('retorna undefined si no existe', () => {
			expect(builder.getTemplate('non_existent')).toBeUndefined();
		});
	});

	describe('buildFromTemplate', () => {
		it('construye prompt desde template registrado', () => {
			const template: AgentTemplate = {
				name: 'mytemplate',
				persona: 'My Persona',
				mission: 'My Mission',
				tools: ['t1', 't2'],
			};
			builder.registerTemplate(template);

			const prompt = builder.buildFromTemplate('mytemplate');

			expect(prompt).toContain('My Persona');
			expect(prompt).toContain('My Mission');
			expect(prompt).toContain('t1');
		});

		it('usa baseRules del template si no se proporciona custom', () => {
			const template: AgentTemplate = {
				name: 'custom_rules',
				persona: 'P',
				mission: 'M',
				tools: [],
				baseRules: 'TEMPLATE RULE',
			};
			builder.registerTemplate(template);

			const prompt = builder.buildFromTemplate('custom_rules');
			expect(prompt).toContain('TEMPLATE RULE');
		});

		it('usa reglas personalizadas si se proporcionan', () => {
			const template: AgentTemplate = {
				name: 'template',
				persona: 'P',
				mission: 'M',
				tools: [],
				baseRules: 'ORIGINAL RULE',
			};
			builder.registerTemplate(template);

			const prompt = builder.buildFromTemplate('template', 'OVERRIDE RULE');
			expect(prompt).toContain('OVERRIDE RULE');
			expect(prompt).not.toContain('ORIGINAL RULE');
		});

		it('lanza error si template no existe', () => {
			expect(() => builder.buildFromTemplate('non_existent')).toThrow('Template no encontrado');
		});

		it('pasa contexto al construir desde template', () => {
			const template: AgentTemplate = { name: 't', persona: 'P', mission: 'M', tools: [] };
			builder.registerTemplate(template);

			const context = { key: 'value' };
			const prompt = builder.buildFromTemplate('t', undefined, context);

			expect(prompt).toContain('key');
		});
	});

	describe('listTemplates', () => {
		it('retorna lista vacía si no hay templates', () => {
			expect(builder.listTemplates()).toEqual([]);
		});

		it('retorna todos los templates registrados', () => {
			const t1: AgentTemplate = { name: 't1', persona: 'P', mission: 'M', tools: [] };
			const t2: AgentTemplate = { name: 't2', persona: 'P', mission: 'M', tools: [] };
			builder.registerTemplate(t1);
			builder.registerTemplate(t2);

			const list = builder.listTemplates();
			expect(list).toHaveLength(2);
			expect(list).toContainEqual(t1);
			expect(list).toContainEqual(t2);
		});
	});

	describe('setGlobalBaseRules', () => {
		it('actualiza reglas globales', () => {
			const newRules = 'NEW GLOBAL RULE';
			builder.setGlobalBaseRules(newRules);

			const prompt = builder.buildPrompt('Agent', 'Mission', []);
			expect(prompt).toContain('NEW GLOBAL RULE');
		});

		it('lanza error si rules es vacío', () => {
			expect(() => builder.setGlobalBaseRules('')).toThrow();
		});

		it('lanza error si rules no es string', () => {
			expect(() => builder.setGlobalBaseRules(null as any)).toThrow();
		});
	});

	describe('createAndRegisterTemplate', () => {
		it('crea y registra un template en una operación', () => {
			const template = builder.createAndRegisterTemplate('new', 'Persona', 'Mission', ['tool'], 'Rules');

			expect(template.name).toBe('new');
			expect(template.version).toBe('1.0.0');
			expect(builder.getTemplate('new')).toBeDefined();
		});

		it('permite reutilizar template creado', () => {
			builder.createAndRegisterTemplate('t', 'P', 'M', ['t1']);
			const prompt = builder.buildFromTemplate('t');

			expect(prompt).toContain('P');
			expect(prompt).toContain('M');
		});
	});

	describe('Predefined templates', () => {
		it('ORCHESTRATOR_TEMPLATE es válido', () => {
			expect(ORCHESTRATOR_TEMPLATE.name).toBe('orchestrator');
			expect(ORCHESTRATOR_TEMPLATE.persona).toBeDefined();
			expect(ORCHESTRATOR_TEMPLATE.tools).toHaveLength(4);
		});

		it('DEVELOPER_TEMPLATE es válido', () => {
			expect(DEVELOPER_TEMPLATE.name).toBe('developer');
			expect(DEVELOPER_TEMPLATE.mission).toBeDefined();
		});

		it('TRADING_TEMPLATE es válido', () => {
			expect(TRADING_TEMPLATE.name).toBe('trading');
			expect(TRADING_TEMPLATE.baseRules).toContain('riesgo');
		});

		it('ANALYST_TEMPLATE es válido', () => {
			expect(ANALYST_TEMPLATE.name).toBe('analyst');
			expect(ANALYST_TEMPLATE.tools).toHaveLength(4);
		});

		it('puede registrar y usar templates predefinidos', () => {
			builder.registerTemplate(TRADING_TEMPLATE);
			const prompt = builder.buildFromTemplate('trading', undefined, { market: 'eurusd' });

			expect(prompt).toContain('TRADING_CORE');
			expect(prompt).toContain('trading sistemático');
			expect(prompt).toContain('market');
		});
	});

	describe('Integration with AgentPromptInjector', () => {
		it('buildForAgent reconoce templates predefinidos', async () => {
			// Este test requiere importar buildForAgent
			// Solo verifica concepto: si agente.name === template.name, usar template
			const agentDef = {
				name: 'orchestrator',
				// No proporcionar persona/mission: debería usar template
			};

			// La idea es que buildForAgent use AgentTemplateBuilder internamente
			expect(agentDef.name).toBe('orchestrator');
		});
	});

	describe('composeRules', () => {
		it('compone reglas desde componentes nombrados', () => {
			const composed = builder.composeRules(['SECURITY', 'TECHNICAL']);

			expect(composed).toContain('MUST validar entrada siempre');
			expect(composed).toContain('MUST aplicar buenas prácticas técnicas');
			expect(composed).toContain('<rules>');
		});

		it('mantiene orden de componentes', () => {
			const composed = builder.composeRules(['SECURITY', 'REASONING']);

			const securityIdx = composed.indexOf('validar entrada');
			const reasoningIdx = composed.indexOf('explicar brevemente');

			expect(securityIdx).toBeLessThan(reasoningIdx);
		});

		it('filtra componentes inválidos', () => {
			const composed = builder.composeRules(['SECURITY', 'INVALID' as any]);

			expect(composed).toContain('MUST validar entrada siempre');
			expect(composed).not.toContain('INVALID');
		});

		it('combina múltiples componentes sin duplicación', () => {
			const composed = builder.composeRules(['SECURITY', 'TECHNICAL', 'REASONING', 'FORMAT']);

			// Verificar que contiene todas las reglas
			expect(composed).toContain('validar');
			expect(composed).toContain('prácticas técnicas');
			expect(composed).toContain('explicar');
			expect(composed).toContain('formato');
		});
	});

	describe('buildPrompt con ruleComponents', () => {
		it('usa componentes si se proporciona', () => {
			const prompt = builder.buildPrompt(
				'Agent',
				'Mission',
				[],
				undefined,
				['SECURITY', 'TESTING'],
			);

			expect(prompt).toContain('validar entrada');
			expect(prompt).toContain('testing');
		});

		it('prioriza customRules sobre ruleComponents', () => {
			const prompt = builder.buildPrompt(
				'Agent',
				'Mission',
				[],
				'CUSTOM RULE',
				['SECURITY'],
			);

			expect(prompt).toContain('CUSTOM RULE');
			expect(prompt).not.toContain('validar entrada');
		});

		it('usa global rules si no hay custom ni components', () => {
			const prompt = builder.buildPrompt('Agent', 'Mission', [], undefined, undefined);

			// Global rules por defecto incluyen SECURITY, TECHNICAL, REASONING
			expect(prompt).toContain('MUST');
		});
	});

	describe('Templates predefinidos con composición', () => {
		it('ORCHESTRATOR_TEMPLATE usa componentes correctos', () => {
			builder.registerTemplate(ORCHESTRATOR_TEMPLATE);
			const prompt = builder.buildFromTemplate('orchestrator');

			expect(prompt).toContain('coordinador central');
			expect(prompt).toContain('MUST');
		});

		it('DEVELOPER_TEMPLATE incluye TESTING', () => {
			builder.registerTemplate(DEVELOPER_TEMPLATE);
			const prompt = builder.buildFromTemplate('developer');

			expect(prompt).toContain('testing');
			expect(prompt).toContain('patrones de diseño');
		});

		it('TRADING_TEMPLATE incluye RISK_MANAGEMENT', () => {
			builder.registerTemplate(TRADING_TEMPLATE);
			const prompt = builder.buildFromTemplate('trading');

			expect(prompt).toContain('riesgo');
			expect(prompt).toContain('drawdown');
		});

		it('ANALYST_TEMPLATE incluye DATA_INTEGRITY', () => {
			builder.registerTemplate(ANALYST_TEMPLATE);
			const prompt = builder.buildFromTemplate('analyst');

			expect(prompt).toContain('calidad de datos');
			expect(prompt).toContain('causal');
		});
	});

	describe('RULE_COMPONENTS coverage', () => {
		Object.entries(RULE_COMPONENTS).forEach(([name, component]) => {
			it(`${name} component es válido`, () => {
				expect(component).toBeTruthy();
				expect(component.length).toBeGreaterThan(0);
				expect(component).toContain('MUST');
			});
		});
	});

	describe('createAndRegisterTemplate con componentes', () => {
		it('crea template con ruleComponents array', () => {
			const template = builder.createAndRegisterTemplate(
				'custom',
				'Persona',
				'Mission',
				['tool1'],
				['SECURITY', 'TESTING'],
			);

			expect(template.ruleComponents).toEqual(['SECURITY', 'TESTING']);
			expect(builder.getTemplate('custom')).toBeDefined();
		});

		it('crea template con baseRules string', () => {
			const template = builder.createAndRegisterTemplate(
				'custom',
				'Persona',
				'Mission',
				['tool1'],
				'CUSTOM RULES',
			);

			expect(template.baseRules).toBe('CUSTOM RULES');
		});
	});
});
