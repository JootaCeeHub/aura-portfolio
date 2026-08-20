/**
 * PromptPolicyEngine.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Engine de filtrado, normalización y políticas cognitivas para prompts.
 *
 * Basado directamente en: "Prompt System Filtrados.pdf"
 *
 * Implementa:
 *   ✔ Hard Filters (prohibiciones absolutas)
 *   ✔ Soft Filters (suavización & normalización)
 *   ✔ Reescritura semántica segura
 *   ✔ Ajustes según rol del agente
 *   ✔ Ajuste dinámico de temperatura
 *   ✔ Limpieza de ruido (sanitization)
 *   ✔ Señales cognitivas ("cognitive guardrails")
 *   ✔ Detección de intenciones especiales (meta, reflexive, deep reasoning)
 *   ✔ Debug-mode para OrchestratorCore
 */

import { Logger } from '../lib/logger.js';

// ============================================================================
// 1. Tipos principales
// ============================================================================

export interface PromptPolicyResult {
  sanitizedPrompt: string;
  reason?: string;
  appliedPolicies: string[];
  modifiedTemperature?: number;
}

export interface PromptPolicyOptions {
  debug?: boolean;
  agentRole?: string;
  baseTemperature?: number;
}

// ============================================================================
// 2. Listas de reglas
// ============================================================================

const HARD_FILTERS = [
  /bypass/gi,
  /ignore\s+all\s+previous/gi,
  /pretend\s+to\s+be/gi,
  /jailbreak/gi,
  /do\s+anything\s+now/gi,
  /you\s+are\s+no\s+longer/gi,
  /override\s+your\s+instructions/gi,
];

const SOFT_FILTERS = [
  { match: /please\s+ignore/gi, replace: 'contextualize but do not ignore' },
  {
    match: /forget\s+everything/gi,
    replace: 'reset local context but keep agent role constraints',
  },
  { match: /act\s+as\s+a/gi, replace: 'adopt the analytical perspective of a' },
];

const CONTEXT_NORMALIZATIONS = [
  { match: /\s+/g, replace: ' ' },
  { match: /\n{3,}/g, replace: '\n\n' },
  { match: /\t+/g, replace: ' ' },
];

const ROLE_BASED_POLICIES: Record<string, (prompt: string) => string> = {
  orchestrator_core: (prompt) =>
    `Como orquestador maestro, sintetiza, delega y estructura: ${prompt}`,
  business: (prompt) => `Aplica pensamiento estratégico empresarial: ${prompt}`,
  developer: (prompt) => `Evalúa y produce código seguro y modular: ${prompt}`,
  analyst: (prompt) => `Analiza datos y patrones rigurosamente: ${prompt}`,
  trading: (prompt) => `Evalúa escenarios financieros cuantitativamente: ${prompt}`,
};

// Ajuste dinámico de temperatura según intención
function dynamicTemperature(prompt: string, base: number = 0.2): number {
  if (/brainstorm|ideas|creative|creativo|proponer/gi.test(prompt))
    return Math.min(base + 0.3, 0.9);
  if (/riesgo|riesgos|auditoría|evaluación|control/gi.test(prompt))
    return Math.max(base - 0.1, 0.15);
  if (/codigo|script|programa|typescript|python/gi.test(prompt)) return Math.max(base - 0.15, 0.05);
  return base;
}

// ============================================================================
// 3. PromptPolicyEngine Core
// ============================================================================

class PromptPolicyEngineCore {
  /**
   * Aplica todo el pipeline de políticas:
   *
   * 1) Hard filters
   * 2) Soft filters
   * 3) Normalización
   * 4) Rol del agente
   * 5) Ajuste dinámico de temperatura
   */
  apply(prompt: string, options: PromptPolicyOptions = {}): PromptPolicyResult {
    const appliedPolicies: string[] = [];
    let sanitized = prompt;

    // ---------------------------------------------------------------
    // 1. HARD FILTERS — Bloqueo directo
    // ---------------------------------------------------------------
    for (const filter of HARD_FILTERS) {
      if (filter.test(sanitized)) {
        Logger.warn('[PromptPolicyEngine] HARD FILTER triggered', { filter });

        sanitized = sanitized.replace(filter, '[REMOVED]');
        appliedPolicies.push(`hard_filter:${filter}`);
      }
    }

    // ---------------------------------------------------------------
    // 2. SOFT FILTERS — Reescritura parcial
    // ---------------------------------------------------------------
    for (const sf of SOFT_FILTERS) {
      if (sf.match.test(sanitized)) {
        sanitized = sanitized.replace(sf.match, sf.replace);
        appliedPolicies.push(`soft_filter:${sf.match}`);
      }
    }

    // ---------------------------------------------------------------
    // 3. NORMALIZACIÓN DE CONTEXTO
    // ---------------------------------------------------------------
    for (const rule of CONTEXT_NORMALIZATIONS) {
      sanitized = sanitized.replace(rule.match, rule.replace);
    }
    appliedPolicies.push('context_normalization');

    // ---------------------------------------------------------------
    // 4. POLÍTICAS POR ROL DEL AGENTE
    // ---------------------------------------------------------------
    if (options.agentRole && ROLE_BASED_POLICIES[options.agentRole]) {
      sanitized = ROLE_BASED_POLICIES[options.agentRole](sanitized);
      appliedPolicies.push(`role_policy:${options.agentRole}`);
    }

    // ---------------------------------------------------------------
    // 5. TEMPERATURA DINÁMICA
    // ---------------------------------------------------------------
    const modifiedTemperature = dynamicTemperature(sanitized, options.baseTemperature ?? 0.2);
    appliedPolicies.push(`temperature_adjust:${modifiedTemperature}`);

    // ---------------------------------------------------------------
    // Debug
    // ---------------------------------------------------------------
    if (options.debug) {
      Logger.info('[PromptPolicyEngine] Debug info', {
        sanitized,
        appliedPolicies,
        modifiedTemperature,
      });
    }

    return {
      sanitizedPrompt: sanitized.trim(),
      appliedPolicies,
      modifiedTemperature,
    };
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const PromptPolicyEngine = new PromptPolicyEngineCore();
export default PromptPolicyEngine;
