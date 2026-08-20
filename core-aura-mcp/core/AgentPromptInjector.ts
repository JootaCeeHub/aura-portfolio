/**
 * AgentPromptInjector.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Inyector de prompts para agentes AURA.
 *
 * Combina:
 *   - PromptSystemFiltered (filosofía global / meta-system prompt)
 *   - PromptTemplateRegistry (plantillas por agente/rol/etapa)
 *   - PromptPolicyEngine (políticas, filtros, temperatura)
 *
 * Objetivo:
 *   ✔ Construir el systemPrompt final de cada agente
 *   ✔ Inyectar contexto global + específico
 *   ✔ Ajustar temperatura según intención y rol
 *   ✔ Mantener trazabilidad de qué plantillas/políticas se aplicaron
 */

import { Logger } from '../src/lib/logger.js';
import { AgentManager } from './agentManager.js';

import { PromptTemplateRegistry, RenderResult } from './PromptTemplateRegistry.js';

import { PromptPolicyEngine } from './PromptPolicyEngine.js';
import { PromptSystemFiltered } from './PromptSystemFiltered.js';

import type { AgentDefinition } from './agentRegistry.js';
import type { PromptTemplateScope } from './PromptTemplateRegistry.js';

// ============================================================================
// 1. Tipos
// ============================================================================

export interface AgentPromptBuildOptions {
  /**
   * Datos adicionales para rellenar plantillas:
   *   - empresa, proyecto, objetivo, contexto, etc.
   */
  data?: Record<string, any>;

  /**
   * Si true, se loguea el detalle de plantillas/políticas aplicadas.
   */
  debug?: boolean;
}

export interface AgentPromptBuildResult {
  agentName: string;
  finalSystemPrompt: string;
  effectiveTemperature: number;
  appliedTemplates: {
    system?: string;
    memory?: string;
    context?: string;
  };
  appliedPolicies: string[];
}

// ============================================================================
// 2. Utilidades internas
// ============================================================================

function buildScopeForAgent(
  agent: AgentDefinition,
  stage: 'system' | 'memory' | 'context'
): PromptTemplateScope {
  return {
    agent: agent.name,
    role: agent.role as string,
    stage,
  };
}

// ============================================================================
// 3. Núcleo: AgentPromptInjector
// ============================================================================

class AgentPromptInjectorCore {
  /**
   * Construye el systemPrompt final para un agente específico.
   *
   * Pasos:
   *  1. Cargar meta-system prompt global (PromptSystemFiltered)
   *  2. Intentar usar plantilla de sistema (TemplateRegistry, stage=system)
   *  3. Plantilla de memoria y contexto (stage=memory/context)
   *  4. Combinar en un único system prompt estructurado
   *  5. Pasar por PromptPolicyEngine (sanitización + temperatura)
   */
  buildForAgent(
    agent: AgentDefinition,
    options: AgentPromptBuildOptions = {}
  ): AgentPromptBuildResult {
    const data = options.data || {};
    const debug = options.debug ?? false;

    const appliedTemplates: AgentPromptBuildResult['appliedTemplates'] = {};
    const appliedPolicies: string[] = [];

    // ------------------------------------------------------------------------
    // 1. Meta-system prompt global (filosofía AURA)
    // ------------------------------------------------------------------------
    const globalSystem = PromptSystemFiltered.getSystemPrompt();

    // ------------------------------------------------------------------------
    // 2. Plantilla SYSTEM por agente (si existe)
    // ------------------------------------------------------------------------
    let systemBlock = agent.systemPrompt || '';

    try {
      const scope = buildScopeForAgent(agent, 'system');
      const systemTemplate = PromptTemplateRegistry.resolve(agent.name, scope);

      if (systemTemplate) {
        const rendered: RenderResult = PromptTemplateRegistry.render(
          systemTemplate.id,
          data,
          scope,
          { applyPolicies: false }
        );

        systemBlock = rendered.prompt;
        appliedTemplates.system = systemTemplate.id;
      }
    } catch (err: any) {
      Logger.warn('[AgentPromptInjector] No se pudo renderizar template SYSTEM', {
        agent: agent.name,
        error: err.message,
      });
    }

    // Si no hay template y no hay systemPrompt definido, usar mínimo por defecto
    if (!systemBlock.trim()) {
      systemBlock = `Eres el agente ${agent.name} con rol ${agent.role}.`;
    }

    // ------------------------------------------------------------------------
    // 3. Plantilla MEMORY por agente (opcional)
    // ------------------------------------------------------------------------
    let memoryBlock = '';

    try {
      const scope = buildScopeForAgent(agent, 'memory');
      const memTemplate = PromptTemplateRegistry.resolve(agent.name + '_memory', scope);

      if (memTemplate) {
        const rendered: RenderResult = PromptTemplateRegistry.render(
          memTemplate.id,
          { ...data, memory: agent.memory || {} },
          scope,
          { applyPolicies: false }
        );

        memoryBlock = rendered.prompt;
        appliedTemplates.memory = memTemplate.id;
      }
    } catch (err: any) {
      Logger.warn('[AgentPromptInjector] No se pudo renderizar template MEMORY', {
        agent: agent.name,
        error: err.message,
      });
    }

    // ------------------------------------------------------------------------
    // 4. Plantilla CONTEXT por agente (opcional)
    // ------------------------------------------------------------------------
    let contextBlock = '';

    try {
      const scope = buildScopeForAgent(agent, 'context');
      const ctxTemplate = PromptTemplateRegistry.resolve(agent.name + '_context', scope);

      if (ctxTemplate) {
        const rendered: RenderResult = PromptTemplateRegistry.render(ctxTemplate.id, data, scope, {
          applyPolicies: false,
        });

        contextBlock = rendered.prompt;
        appliedTemplates.context = ctxTemplate.id;
      }
    } catch (err: any) {
      Logger.warn('[AgentPromptInjector] No se pudo renderizar template CONTEXT', {
        agent: agent.name,
        error: err.message,
      });
    }

    // ------------------------------------------------------------------------
    // 5. Ensamblaje del SYSTEM PROMPT FINAL
    // ------------------------------------------------------------------------
    const rawSystemPrompt = `
[AURA_GLOBAL_SYSTEM]
${globalSystem}

[AGENT_SYSTEM]
${systemBlock}

${memoryBlock ? `[AGENT_MEMORY]\n${memoryBlock}\n` : ''}

${contextBlock ? `[AGENT_CONTEXT]\n${contextBlock}\n` : ''}

[INSTRUCCIONES_FINALES]
- Sigue las políticas avanzadas de PromptPolicyEngine.
- Respeta siempre las reglas MUST/NEVER definidas en el sistema.
- Usa herramientas solo cuando agreguen valor real.
- Explica brevemente tus decisiones, sin mostrar tu razonamiento interno completo.
    `.trim();

    // ------------------------------------------------------------------------
    // 6. Pasar por PromptPolicyEngine
    // ------------------------------------------------------------------------
    const baseTemp = typeof agent.temperature === 'number' ? agent.temperature : 0.2;

    const policyResult = PromptPolicyEngine.apply(rawSystemPrompt, {
      agentRole: agent.role as string,
      baseTemperature: baseTemp,
      debug,
    });

    appliedPolicies.push(...policyResult.appliedPolicies);

    const finalSystemPrompt = policyResult.sanitizedPrompt;
    const effectiveTemperature = policyResult.modifiedTemperature ?? baseTemp;

    if (debug) {
      Logger.info('[AgentPromptInjector] Prompt final construido', {
        agent: agent.name,
        effectiveTemperature,
        appliedTemplates,
        appliedPolicies,
      });
    }

    return {
      agentName: agent.name,
      finalSystemPrompt,
      effectiveTemperature,
      appliedTemplates,
      appliedPolicies,
    };
  }

  /**
   * Inyecta el systemPrompt final en el agente y lo vuelve a registrar
   * en el AgentManager.
   */
  injectIntoAgent(
    agentName: string,
    options: AgentPromptBuildOptions = {}
  ): AgentDefinition | null {
    const existing = AgentManager.get(agentName) as AgentDefinition | undefined;

    if (!existing) {
      Logger.error('[AgentPromptInjector] Agente no encontrado', { agentName });
      return null;
    }

    const build = this.buildForAgent(existing, options);

    const updated: AgentDefinition = {
      ...existing,
      systemPrompt: build.finalSystemPrompt,
      temperature: build.effectiveTemperature,
    };

    AgentManager.register(updated);

    Logger.info('[AgentPromptInjector] SystemPrompt inyectado al agente', {
      agentName,
      effectiveTemperature: build.effectiveTemperature,
    });

    return updated;
  }

  /**
   * Inyecta prompts en TODOS los agentes registrados (si AgentManager.list existe).
   * Útil para fase de bootstrap.
   */
  injectForAllRegisteredAgents(options: AgentPromptBuildOptions = {}) {
    const listFn = (AgentManager as any).list;

    if (typeof listFn !== 'function') {
      Logger.warn(
        '[AgentPromptInjector] AgentManager.list no está disponible; no se puede hacer inyección masiva.'
      );
      return;
    }

    const agents: AgentDefinition[] = listFn();
    agents.forEach((a) => {
      this.injectIntoAgent(a.name, options);
    });

    Logger.info('[AgentPromptInjector] Inyección masiva completada', {
      total: agents.length,
    });
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const AgentPromptInjector = new AgentPromptInjectorCore();
export default AgentPromptInjector;
