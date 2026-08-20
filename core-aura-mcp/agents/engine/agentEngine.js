/**
 * AgentEngine.ts — AURA-MCP
 * ====================================================================
 * Este archivo unifica:
 *
 *  ✔ AgentGenerator — Crear agentes dinámicos + escribir prompt file
 *  ✔ AgentFactory   — Construir agentes a partir de prompts
 *  ✔ AgentBuilder   — Construir agente LangChain (ReAct + Tools MCP)
 *  ✔ LangChainExecutor — Ejecutar agentes usando LLMs avanzados
 *
 * Cumple:
 *  - MCP Langchaing.pdf
 *  - Arquitectura AURA-MCP-Core
 *  - AURA Cognitive Layer
 *
 * Es el núcleo del sistema cognitivo distribuido de AURA.
 */
import fs from 'fs';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { Logger } from '../../src/lib/logger.js';
import { Config } from '../../src/lib/config.js';
import { AgentManager } from '../core/agentManager.js';
import { validateAgentDefinition, validatePromptHeader } from '../adapters/agentSchemas.js';
// =========================================================
// 1. AGENT GENERATOR — Crear agentes dinámicos
// =========================================================
export class AgentGenerator {
  static async createAgent(args) {
    const { name, role, tools = [], description = '', systemPrompt = '' } = args;
    // Validación estructural previa
    const validated = validateAgentDefinition({
      name,
      role: role,
      description,
      systemPrompt,
      allowedTools: tools,
      memory: {},
      temperature: 0.2,
    });
    const content = `# NAME: ${validated.name}
# ROLE: ${validated.role}
# TOOLS: ${validated.allowedTools.join(',')}

${validated.systemPrompt || 'Agente generado dinámicamente por AURA-MCP.'}
`;
    const filePath = path.join(AgentGenerator.basePath, `agent_${name}.txt`);
    fs.writeFileSync(filePath, content, 'utf8');
    AgentManager.register(validated);
    Logger.info('[AgentGenerator] Agente creado correctamente', {
      name,
      role,
    });
    return { ok: true, agent: validated };
  }
}
AgentGenerator.basePath = 'src/repository/prompts';
// =========================================================
// 2. AGENT FACTORY — Carga agentes desde archivo prompt
// =========================================================
export class AgentFactory {
  static filePath(id) {
    return path.join(process.cwd(), 'src/repository/prompts', `${id}.txt`);
  }
  static async createFromPrompt(agentId) {
    const fullPath = this.filePath(agentId);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Archivo prompt no encontrado: ${fullPath}`);
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    const NAME = raw.match(/#\s*NAME:\s*(.*)/)?.[1]?.trim();
    const ROLE = raw.match(/#\s*ROLE:\s*(.*)/)?.[1]?.trim();
    const TOOLS_LINE = raw.match(/#\s*TOOLS:\s*(.*)/)?.[1]?.trim() ?? '';
    if (!NAME || !ROLE) {
      throw new Error(`Header inválido en ${fullPath}`);
    }
    const header = validatePromptHeader({
      NAME,
      ROLE,
      TOOLS: TOOLS_LINE.split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    const systemPrompt = raw
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n')
      .trim();
    Logger.info('[AgentFactory] Construyendo agente desde prompt', {
      agentId,
    });
    return AgentBuilder.buildAgent(agentId, systemPrompt);
  }
}
export class AgentBuilder {
  static async buildAgent(agentName, systemPrompt) {
    const meta = AgentManager.get(agentName);
    if (!meta) throw new Error(`Agente no encontrado: ${agentName}`);
    Logger.info('[AgentBuilder] Construyendo agente AURA', { agentName });
    // -------------------------------
    // 1. LLM Principal
    // -------------------------------
    const llm = new ChatOpenAI({
      modelName: Config.defaultLLM || process.env.AURA_MODEL || 'gpt-4.1',
      temperature: meta.temperature ?? 0.2,
      streaming: true,
      apiKey: Config.openaiKey,
      callbacks: [],
    });
    // -------------------------------
    // 2. Tools (locales + MCP tools)
    // -------------------------------
    let tools = [];
    try {
      if (global.AURA_TOOLKIT) {
        tools = global.AURA_TOOLKIT.getTools(meta.allowedTools);
      }
    } catch (err) {
      Logger.warn('[AgentBuilder] Error obteniendo tools', {
        agentName,
        error: err.message,
      });
    }
    Logger.info('[AgentBuilder] Tools cargadas', {
      agentName,
      totalTools: tools.length,
    });
    // -------------------------------
    // 3. Memoria conversacional LangChain
    // -------------------------------
    const memory = undefined;
    // -------------------------------
    // 4. Crear agente LangChain + tools
    // -------------------------------
    const { AgentExecutor, createToolCallingAgent } = await import('langchain/agents');
    const lcAgent = await createToolCallingAgent({
      llm,
      tools,
      prompt: systemPrompt,
    });
    // -------------------------------
    // 5. Crear executor
    // -------------------------------
    const executor = AgentExecutor.fromAgentAndTools({
      agent: lcAgent,
      tools,
      memory,
      verbose: true,
    });
    return new LangChainExecutor(executor);
  }
}
// =========================================================
// 4. LANGCHAIN EXECUTOR — Ejecuta agentes construidos
// =========================================================
export class LangChainExecutor {
  constructor(executor) {
    this.executor = executor;
  }
  async run(input, context = {}) {
    Logger.info('[LangChainExecutor] Invocando agente', {
      preview: input.slice(0, 200),
    });
    const result = await this.executor.invoke({
      input,
      context,
    });
    return result.output ?? result;
  }
  static async runAgent(agentName, input, context = {}) {
    const agent = AgentManager.get(agentName);
    if (!agent) {
      throw new Error(`Agente no encontrado: ${agentName}`);
    }
    const executor = await AgentFactory.createFromPrompt(agentName);
    return executor.run(input, context);
  }
}
