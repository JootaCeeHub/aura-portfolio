// AgentDefinition: adaptar/expandir según las interfaces reales del proyecto
export interface AgentDefinition {
  name: string;
  role: string;
  description?: string;
  version?: string;
  systemPrompt?: string;
  capabilities?: string[];
  allowedTools?: string[];
  memory?: Record<string, any>;
  temperature?: number;
}

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();

  register(agent: AgentDefinition): void {
    if (!agent || !agent.name) throw new Error('Invalid agent definition: missing name');
    if (this.agents.has(agent.name)) throw new Error(`Agent ${agent.name} already registered`);
    this.agents.set(agent.name, agent);
  }

  get(name: string): AgentDefinition | null {
    return this.agents.get(name) || null;
  }

  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  unregister(name: string): boolean {
    return this.agents.delete(name);
  }

  clear(): void {
    this.agents.clear();
  }
}
