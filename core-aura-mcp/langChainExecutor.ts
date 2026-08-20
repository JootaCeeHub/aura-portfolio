/**
 * langchainExecutor.ts — AURA-MCP
 * ==============================================================================
 * Ejecuta agentes AURA sobre el motor de lenguaje configurado (global.AURA_MODEL)
 * con soporte para:
 *
 *  ✔ Tools dinámicas (ToolRegistry + AURAToolkit)
 *  ✔ Validación de agentes con AgentSchemas
 *  ✔ Integración directa con PipelineEngine (etapa primaria)
 *  ✔ Registro de trazas (traceId, modelo, tools, latencia)
 *
 * Diseñado para trabajar con:
 *   - PipelineEngine.run()
 *   - AgentManager
 *   - AURAToolkit
 *   - ToolRegistry
 */

import { Logger } from './src/lib/logger.js';
import { metricsCollector } from './src/lib/metrics.js';
import { configService } from './src/config/index.js';

import { AgentManager } from './agents/core/agentManager.js';
import { AURAToolkit } from './agents/adapters/auraToolkit.js';
import { ToolRegistry } from './core/toolRegistry.js';

import { validateAgentDefinition, AgentDefinition } from './agents/adapters/agentSchemas.js';

// import type { AgentDefinition } from './src/types/interfaces.js';

// ============================================================================
// 1. Tipos internos
// ============================================================================

interface ModelPayload {
  model: string;
  temperature: number;
  systemPrompt: string;
  input: string;
  context: any;
  tools: {
    name: string;
    description: string;
    func: (args: any) => Promise<any>;
  }[];
  agentMeta: {
    name: string;
    role: string;
  };
}

// ============================================================================
// 2. Utilidades internas
// ============================================================================

function createTraceId(): string {
  const now = Date.now().toString(16);
  const rand = Math.floor(Math.random() * 1e8).toString(16);
  return `trace_${now}_${rand}`;
}

function getAuraModel() {
  const model = (globalThis as any).AURA_MODEL;
  if (!model || typeof model.invoke !== 'function') {
    throw new Error(
      '[LangChainExecutor] global.AURA_MODEL no está configurado o no expone invoke().'
    );
  }
  return model;
}

// ============================================================================
// 3. LangChainExecutor — Clase principal
// ============================================================================

export class LangChainExecutor {
  /**
   * Ejecuta un agente AURA usando el modelo configurado.
   *
   * Usado por:
   *  - PipelineEngine (etapa primaria y backups por rol)
   *  - Cualquier llamada directa desde el Core
   */
  static async runAgent(agentName: string, input: string, context: any = {}): Promise<any> {
    const traceId = createTraceId();
    const startedAt = Date.now();

    // 2. Init trace
    Logger.info('[LangChainExecutor] Iniciando ejecución', {
      traceId,
      agentName,
      inputLength: input.length,
    });

    metricsCollector.countAgentCall?.(agentName); // Changed from countIntent

    // --------------------------------------------------------------
    // 1. Resolver y validar agente
    // --------------------------------------------------------------
    const storedAgent = AgentManager.get(agentName) as AgentDefinition | undefined;

    if (!storedAgent) {
      Logger.error('[LangChainExecutor] Agente no encontrado', {
        traceId,
        agent: agentName,
      });
      throw new Error(`Agente no registrado: ${agentName}`);
    }

    const agent = validateAgentDefinition(storedAgent);

    // --------------------------------------------------------------
    // 2. Inicializar ToolRegistry y obtener tools dinámicas
    // --------------------------------------------------------------
    await ToolRegistry.initialize();

    const tools = await AURAToolkit.getTools(agent);

    Logger.info('[LangChainExecutor] Tools asignadas al agente', {
      traceId,
      agent: agent.name,
      tools: tools.map((t) => t.name),
    });

    // --------------------------------------------------------------
    // 3. Preparar payload para el modelo
    // --------------------------------------------------------------
    const modelName =
      (configService.get('primaryModel') as string) ||
      (configService.get('fallbackModel') as string) ||
      'gpt-4o-mini';

    const temperature = typeof agent.temperature === 'number' ? agent.temperature : 0.2;

    const payload: ModelPayload = {
      model: modelName,
      temperature,
      systemPrompt: agent.systemPrompt || '',
      input,
      context: {
        ...context,
        agent: {
          name: agent.name,
          role: agent.role,
          memory: agent.memory || {},
        },
      },
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        func: async (args: any) => t.func(args),
      })),
      agentMeta: {
        name: agent.name,
        role: agent.role,
      },
    };

    const auraModel = getAuraModel();

    // --------------------------------------------------------------
    // 4. Invocar modelo con soporte de tools
    // --------------------------------------------------------------
    try {
      const result = await auraModel.invoke(payload);

      const durationMs = Date.now() - startedAt;
      metricsCollector.recordExecution(agentName, durationMs, true, traceId);

      Logger.info('[LangChainExecutor] Ejecución completada', {
        traceId,
        agent: agent.name,
        model: modelName,
        durationMs,
      });

      // Registrar traza opcionalmente
      try {
        const tracer = (globalThis as any).AURA_TRACE;
        if (tracer && typeof tracer.capture === 'function') {
          tracer.capture({
            traceId,
            agent: agent.name,
            role: agent.role,
            model: modelName,
            durationMs,
            tools: tools.map((t) => t.name),
            inputPreview: input.slice(0, 300),
          });
        }
      } catch {
        // Si falla el sistema de trazas, no rompemos la ejecución
      }

      return result;
    } catch (err: any) {
      metricsCollector.recordExecution(
        agentName,
        Date.now() - startedAt,
        false,
        traceId,
        0,
        (err as Error).message
      );

      Logger.error('[LangChainExecutor] Error ejecutando agente', {
        traceId,
        agentName,
        model: modelName,
        durationMs: Date.now() - startedAt,
        error: err.message,
      });

      throw err;
    }
  }

  /**
   * Ejecuta un agente pasando ya el AgentDefinition (útil para testing
   * o agentes generados on-the-fly sin usar AgentManager).
   */
  static async runWithDefinition(
    agent: AgentDefinition,
    input: string,
    context: any = {}
  ): Promise<any> {
    const traceId = createTraceId();
    const startedAt = Date.now();

    // Validamos la definición
    const validated = validateAgentDefinition(agent);

    // Inicializar tools
    await ToolRegistry.initialize();
    const tools = await AURAToolkit.getTools(validated);

    const modelName =
      (configService.get('primaryModel') as string) ||
      (configService.get('fallbackModel') as string) ||
      'gpt-4o-mini';

    const temperature = typeof validated.temperature === 'number' ? validated.temperature : 0.2;

    const payload: ModelPayload = {
      model: modelName,
      temperature,
      systemPrompt: validated.systemPrompt || '',
      input,
      context: {
        ...context,
        agent: {
          name: validated.name,
          role: validated.role,
          memory: validated.memory || {},
        },
      },
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        func: async (args: any) => t.func(args),
      })),
      agentMeta: {
        name: validated.name,
        role: validated.role,
      },
    };

    const auraModel = getAuraModel();

    try {
      const result = await auraModel.invoke(payload);
      const durationMs = Date.now() - startedAt;

      metricsCollector.recordExecution(validated.name, durationMs, true, traceId);

      Logger.info('[LangChainExecutor] runWithDefinition ok', {
        traceId,
        agent: validated.name,
        model: modelName,
        durationMs,
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      metricsCollector.recordExecution(
        validated.name,
        durationMs,
        false,
        traceId,
        0,
        (err as Error).message
      );

      Logger.error('[LangChainExecutor] runWithDefinition error', {
        traceId,
        agent: validated.name,
        model: modelName,
        durationMs,
        error: err.message,
      });

      throw err;
    }
  }
}

export default LangChainExecutor;
