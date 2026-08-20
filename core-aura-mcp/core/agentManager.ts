import { AgentRegistry, AgentDefinition } from './agentRegistry';
import { AgentFactory } from './agentFactory';
import { Logger } from '../src/lib/logger';

type AgentInstance = any;

export class AgentManager {
  private registry: AgentRegistry;
  private factory: AgentFactory;
  private logger: typeof Logger;

  constructor(options?: {
    registry?: AgentRegistry;
    factory?: AgentFactory;
    logger?: typeof Logger;
    promptInjector?: any;
  }) {
    this.registry = options?.registry ?? new AgentRegistry();
    this.logger = options?.logger ?? Logger;
    const promptInjector = options?.promptInjector ?? {
      buildForAgent: async () => '',
    };
    this.factory = options?.factory ?? new AgentFactory(this.registry, this.logger, promptInjector);
  }

  register(agent: AgentDefinition): void {
    this.logger.debug('agentManager.register.start', { name: agent.name });
    this.registry.register(agent);
    this.logger.info('agentManager.registered', { name: agent.name });
  }

  registerAll(agents: AgentDefinition[]): void {
    for (const a of agents) {
      try {
        this.register(a);
      } catch (err) {
        this.logger.warn('agentManager.registerAll.skip', {
          name: a.name,
          reason: (err as Error).message,
        });
      }
    }
  }

  async create(name: string, context?: Record<string, any>): Promise<AgentInstance> {
    this.logger.debug('agentManager.create.start', { name });
    const instance = await this.factory.createAgent(name, context);
    this.logger.info('agentManager.create.finished', { name });
    return instance;
  }

  getDefinition(name: string): AgentDefinition | null {
    return this.registry.get(name);
  }

  listDefinitions(): AgentDefinition[] {
    return this.registry.list();
  }

  unregister(name: string): boolean {
    const removed = this.registry.unregister(name);
    if (removed) this.logger.info('agentManager.unregistered', { name });
    return removed;
  }

  clearRegistry(): void {
    this.registry.clear();
    this.logger.info('agentManager.clearedRegistry');
  }

  // --- Static Singleton for Legacy/Global Access ---
  private static instance: AgentManager;

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  static register(agent: AgentDefinition): void {
    this.getInstance().register(agent);
  }

  static get(name: string): AgentDefinition | null {
    return this.getInstance().getDefinition(name);
  }

  static list(): AgentDefinition[] {
    return this.getInstance().listDefinitions();
  }

  static unregister(name: string): boolean {
    return this.getInstance().unregister(name);
  }
}

// Ejemplo de uso en main (añadir en main.ts o el bootstrap de la app)
/*
import { AgentManager } from './core/agentManager';
import { AgentRegistry } from './core/agentRegistry';
import { AgentFactory } from './core/agentFactory';
import { Logger } from './src/lib/logger';
import * as builtAgents from './agents'; // ejemplo: lista de definiciones

const registry = new AgentRegistry();
const manager = new AgentManager({ registry, logger: Logger, promptInjector: YourPromptInjectorInstance });

// Registrar agentes al inicio
manager.registerAll([orchestratorCore, developerCore, tradingCore]);

// Crear agente
const agent = await manager.create('orchestrator_core', { user: 'johan' });
*/
