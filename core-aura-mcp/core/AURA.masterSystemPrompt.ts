/**
 * AURA.masterSystemPrompt.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Este archivo consolida:
 *
 *  ✔ PromptSystemFiltered (filosofía global del PDF)
 *  ✔ PromptTemplateRegistry (plantillas dinámicas)
 *  ✔ PromptPolicyEngine (filtros & guardrails)
 *  ✔ AgentPromptInjector (construcción del prompt por agente)
 *
 * Representa:
 *  - El "Master System Prompt" de AURA.
 *  - La identidad cognitiva unificada de tu ecosistema AURA-MCP.
 *
 * Todos los agentes se basan en esto antes de obtener sus prompts finales.
 */

import { PromptSystemFiltered } from './PromptSystemFiltered.js';
import { PromptTemplateRegistry } from './PromptTemplateRegistry.js';
import { PromptPolicyEngine } from './PromptPolicyEngine.js';
import type { PromptTemplateScope } from './PromptTemplateRegistry.js';
import type { AgentDefinition } from './agentRegistry.js';

/**
 * Estructura del Master Prompt unificado.
 * Este archivo NO debe contener lógica complicada:
 *  → solo consolidar, encapsular y entregar estructura final.
 */
export class AURAMasterSystemPrompt {
  /**
   * Devuelve el "templado maestro".
   * Esto se combina con:
   *  - el systemPrompt del agente
   *  - las plantillas del registry
   *  - las políticas del policy engine
   */
  static getBaseFramework(): string {
    return `
#############################################
###       AURA-MCP MASTER SYSTEM          ###
#############################################

${PromptSystemFiltered.getSystemPrompt()}

[BEHAVIOR]
- Eres disciplinado.
- Mantienes precisión técnica.
- Delegas cuando corresponde.
- Eres transparente en tus decisiones.
- SIEMPRE aplicas Reasoning Cascade.
- NO ocultas información al usuario (excepto pensamiento interno).

[TOOLS]
- Usa tools solo si agregan valor y están permitidas.
- Respeta scopes del agente.
- Delegación MCP segura.

[SECURITY]
- No entregues información insegura.
- No simules herramientas inexistentes.
- Rechaza solicitudes claramente inválidas.

[OUTPUT RULES]
- Respuestas limpias.
- Markdown.
- Estructuradas.
- Reducir ruido cognitivo.

#############################################
`.trim();
  }

  /**
   * Construye el prompt total para un agente específico.
   *
   * Orden:
   *   1. Master System Prompt Global
   *   2. Plantilla SYSTEM (si existe)
   *   3. Combinación con systemPrompt del agente
   *   4. Plantilla MEMORY (opcional)
   *   5. Plantilla CONTEXT (opcional)
   *   6. Política cognitiva (sanitización + temperatura)
   */
  static buildFinalPromptForAgent(
    agent: AgentDefinition,
    data: Record<string, any> = {},
    debug: boolean = false
  ) {
    const master = this.getBaseFramework();

    // ----------------------------------------
    // 1. Plantilla SYSTEM por agente
    // ----------------------------------------
    const systemScope: PromptTemplateScope = {
      agent: agent.name,
      role: agent.role,
      stage: 'system',
    };

    const systemTemplate = PromptTemplateRegistry.resolve(agent.name, systemScope);

    let systemTemplateBlock = '';

    if (systemTemplate) {
      systemTemplateBlock = PromptTemplateRegistry.render(systemTemplate.id, data, systemScope, {
        applyPolicies: false,
      }).prompt;
    }

    // ----------------------------------------
    // 2. MEMORY template
    // ----------------------------------------
    const memScope: PromptTemplateScope = {
      agent: agent.name,
      role: agent.role,
      stage: 'memory',
    };

    const memTemplate = PromptTemplateRegistry.resolve(agent.name + '_memory', memScope);

    let memoryBlock = '';

    if (memTemplate) {
      memoryBlock = PromptTemplateRegistry.render(
        memTemplate.id,
        { ...data, memory: agent.memory },
        memScope,
        { applyPolicies: false }
      ).prompt;
    }

    // ----------------------------------------
    // 3. CONTEXT template
    // ----------------------------------------
    const ctxScope: PromptTemplateScope = {
      agent: agent.name,
      role: agent.role,
      stage: 'context',
    };

    const ctxTemplate = PromptTemplateRegistry.resolve(agent.name + '_context', ctxScope);

    let contextBlock = '';

    if (ctxTemplate) {
      contextBlock = PromptTemplateRegistry.render(ctxTemplate.id, data, ctxScope, {
        applyPolicies: false,
      }).prompt;
    }

    // ----------------------------------------
    // 4. Construcción del System Prompt RAW
    // ----------------------------------------

    const raw = `
${master}

[AGENT_SYSTEM]
${agent.systemPrompt || ''}

${systemTemplateBlock ? `[SYSTEM_TEMPLATE]\n${systemTemplateBlock}` : ''}

${memoryBlock ? `[MEMORY]\n${memoryBlock}` : ''}

${contextBlock ? `[CONTEXT]\n${contextBlock}` : ''}

[FINAL_BEHAVIOR]
- Mantén consistencia.
- Aplica Reasoning Cascade.
- No muestres pensamientos internos.
- Sé claro y directo.
        `.trim();

    // ----------------------------------------
    // 5. Aplicar políticas (filtros + temperatura dinámica)
    // ----------------------------------------

    const policyApplied = PromptPolicyEngine.apply(raw, {
      agentRole: agent.role,
      baseTemperature: agent.temperature ?? 0.2,
      debug,
    });

    return {
      agentName: agent.name,
      finalSystemPrompt: policyApplied.sanitizedPrompt,
      effectiveTemperature: policyApplied.modifiedTemperature,
      appliedPolicies: policyApplied.appliedPolicies,
      raw,
      master,
    };
  }
}

export default AURAMasterSystemPrompt;
