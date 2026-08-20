import { Logger } from './logger.js';
import { observabilityService } from './observability.js';

/**
 * Definición de un agente.
 */
export interface AgentDefinition {
	id: string;
	name: string;
	type: 'core' | 'future' | 'custom';
	version: string;
	description: string;
	tools: string[];
	temperature?: number;
	maxTokens?: number;
	persona?: string;
	mission?: string;
	enabled: boolean;
}

/**
 * Templates predefinidos de agentes futuros.
 */
export const FUTURE_AGENT_TEMPLATES: Record<string, AgentDefinition> = {
	code_review: {
		id: 'code_review_agent',
		name: 'Code Review Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Revisor automático de PRs - detecta anti-patterns, security issues',
		tools: ['github.pullRequest', 'code.analyze', 'report.generate'],
		temperature: 0.5,
		maxTokens: 4000,
		enabled: false,
	},
	test_generator: {
		id: 'test_generator_agent',
		name: 'Test Generator Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Genera tests unitarios automáticamente',
		tools: ['code.analyze', 'tests.generate', 'coverage.analyze'],
		temperature: 0.3,
		maxTokens: 3000,
		enabled: false,
	},
	documentation: {
		id: 'documentation_agent',
		name: 'Documentation Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Mantiene docs sincronizadas con código',
		tools: ['code.analyze', 'docs.generate', 'github.commit'],
		temperature: 0.6,
		maxTokens: 2500,
		enabled: false,
	},
	security_scanner: {
		id: 'security_scanner_agent',
		name: 'Security Scanner Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Análisis de seguridad estática - OWASP Top 10',
		tools: ['code.analyze', 'security.scan', 'vulnerability.check'],
		temperature: 0.2,
		maxTokens: 3500,
		enabled: false,
	},
	performance_profiler: {
		id: 'performance_profiler_agent',
		name: 'Performance Profiler Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Identifica cuellos de botella - CPU/memory profiling',
		tools: ['code.analyze', 'profile.run', 'optimization.suggest'],
		temperature: 0.4,
		maxTokens: 3000,
		enabled: false,
	},
	db_optimizer: {
		id: 'db_optimizer_agent',
		name: 'DB Optimizer Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Optimiza queries SQL - índices y schema',
		tools: ['database.query', 'index.analyze', 'query.optimize'],
		temperature: 0.3,
		maxTokens: 2800,
		enabled: false,
	},
	ui_ab_testing: {
		id: 'ui_ab_testing_agent',
		name: 'UI A/B Testing Agent',
		type: 'future',
		version: '0.1.0',
		description: 'Diseña experimentos A/B - análisis estadístico',
		tools: ['ui.design', 'stats.analyze', 'experiment.run'],
		temperature: 0.7,
		maxTokens: 2000,
		enabled: false,
	},
};

/**
 * Factory de agentes.
 */
export class AgentFactory {
	private agents: Map<string, AgentDefinition> = new Map();

	constructor() {
		Logger.debug('agentFactory.initialized');
	}

	/**
	 * Registrar agente.
	 */
	registerAgent(def: AgentDefinition): void {
		if (!def.id || !def.name) {
			throw new Error('Agent debe tener id y name');
		}

		const { endTrace } = observabilityService.createTrace('registerAgent', 'aura-core', {
			agentId: def.id,
		});

		try {
			this.agents.set(def.id, def);
			Logger.info('agentFactory.agent.registered', { agentId: def.id, name: def.name });
			endTrace('success');
		} catch (err) {
			Logger.error('agentFactory.agent.register_failed', { agentId: def.id, error: (err as Error).message });
			endTrace('error', (err as Error).message);
			throw err;
		}
	}

	/**
	 * Obtener agente por ID.
	 */
	getAgent(id: string): AgentDefinition | undefined {
		return this.agents.get(id);
	}

	/**
	 * Listar todos los agentes.
	 */
	listAgents(onlyEnabled: boolean = false): AgentDefinition[] {
		const agents = Array.from(this.agents.values());
		return onlyEnabled ? agents.filter((a) => a.enabled) : agents;
	}

	/**
	 * Habilitar futuro agente.
	 */
	enableFutureAgent(templateKey: string): void {
		const template = FUTURE_AGENT_TEMPLATES[templateKey];
		if (!template) {
			throw new Error(`Template no encontrado: ${templateKey}`);
		}

		const agent: AgentDefinition = {
			...template,
			enabled: true,
		};

		this.registerAgent(agent);
		Logger.info('agentFactory.future_agent.enabled', { agentId: template.id });
	}

	/**
	 * Obtener templates de futuros agentes.
	 */
	getFutureAgentTemplates(): Record<string, AgentDefinition> {
		return FUTURE_AGENT_TEMPLATES;
	}

	/**
	 * Resetear factory.
	 */
	reset(): void {
		this.agents.clear();
	}
}

export const agentFactory = new AgentFactory();

