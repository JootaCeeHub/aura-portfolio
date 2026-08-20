import type { AgentDefinition } from './agentRegistry';
import { Logger } from '../src/lib/logger.js';

type AgentInstance = any;

function createLangChainExecutor(
  def: AgentDefinition,
  prompt: string,
  registry: any
): AgentInstance {
  return {
    definition: def,
    prompt,
    registry,
    exec: async (input: any) => ({ ok: true, input }),
  };
}

export class AgentFactory {
  constructor(
    private registry: { get: (name: string) => AgentDefinition | null },
    private logger: typeof Logger,
    private promptInjector: { buildForAgent: (def: AgentDefinition, opts?: any) => Promise<string> }
  ) {}

  async createAgent(name: string, context?: Record<string, any>): Promise<AgentInstance> {
    this.logger.debug('agentFactory.createAgent.start', { name });
    const definition = this.registry.get(name);
    if (!definition) {
      this.logger.error('agentFactory.createAgent.notFound', { name });
      throw new Error(`Agent ${name} not found`);
    }

    try {
      const prompt = await this.promptInjector.buildForAgent(definition, { data: context ?? {} });
      this.logger.debug('agentFactory.createAgent.promptBuilt', {
        name,
        promptLength: prompt?.length ?? 0,
      });
      const instance = createLangChainExecutor(definition, prompt, this.registry);
      this.logger.info('agentFactory.createAgent.created', { name });
      return instance;
    } catch (err) {
      this.logger.error('agentFactory.createAgent.error', {
        name,
        error: (err as Error).message ?? err,
      });
      throw err;
    }
  }
}
