/**
 * moduleRouter.ts — AURA-MCP
 * ================================================================================
 * Router cognitivo entre módulos MCP+IA.
 *
 * Este módulo implementa el "Dispatcher" descrito en la Plantilla MCP+IA:
 *   - Un mensaje puede activar un módulo concreto, o derivarse a otro.
 *   - Soporta encadenamiento: módulo → agente → módulo siguiente.
 *
 * Alineado con:
 *   • Dispatcher (submódulos / agentes) — PDF
 *     【turn3file1†Plantilla Mcp Ia Modular.pdf†L36-L37】
 *
 *   • Ciclo de vida MCP+AURA → routing entre módulos
 *     【turn3file11†Plantilla Mcp Ia Modular.pdf†L48-L62】
 */

import { Logger } from '../src/lib/logger.js';
import ModuleRegistry from './moduleRegistry.js';

export interface RoutingInput {
  text: string; // mensaje del usuario o evento
  contextId?: string; // cliente
  channel?: string; // api, mobile, web, etc.
  envMode?: string; // local / staging / prod
  currentModuleId?: string; // módulo actual en el flujo
  suggestedNextModule?: string; // módulo que el agente sugirió como next-module
  tags?: string[]; // clasificación semántica previa
  metadata?: any;
}

export interface RoutingDecision {
  moduleId: string | null;
  versionId?: string | null;
  source: string; // cómo se decidió (user → tags → module → fallback)
  resolved: any;
  error?: string | null;
}

/**
 * ModuleRouter — decide qué módulo debe ejecutarse.
 */
export class ModuleRouter {
  /**
   * DECISIÓN PRINCIPAL:
   * 1. Si el input sugiere un "next-module" → úsalo.
   * 2. Si existe módulo específico para tenant/contexto → úsalo.
   * 3. Si existe módulo por canal → úsalo.
   * 4. Si el input matchea tags → úsalo.
   * 5. Caso contrario: "default" o módulo global.
   */
  static decide(input: RoutingInput): RoutingDecision {
    Logger.info('[ModuleRouter] Resolviendo módulo para input...', {
      text_preview: input.text.slice(0, 120),
      contextId: input.contextId,
      channel: input.channel,
      suggestedNextModule: input.suggestedNextModule,
    });

    // =========================================================================
    // 1. NEXT-MODULE sugerido por el agente / pipeline
    // =========================================================================
    if (input.suggestedNextModule) {
      const next = ModuleRegistry.getSmart(input.suggestedNextModule);
      if (next) {
        return {
          moduleId: next.moduleId,
          versionId: next.versionId,
          resolved: next,
          source: 'suggested-next-module',
        };
      }
    }

    // =========================================================================
    // 2. MÓDULO ACTUAL SUGIERE SUCESOR
    //    El PDF dice: “Un módulo puede derivar según estado del flujo”
    //    Ej: onboarding → billing → activación
    // =========================================================================
    if (input.currentModuleId) {
      const current = ModuleRegistry.getSmart(input.currentModuleId);
      const nextId = current?.blueprint.architecture?.uiResponseContract?.metadata?.next_module;

      if (nextId) {
        const nextModule = ModuleRegistry.getSmart(nextId);
        if (nextModule) {
          return {
            moduleId: nextModule.moduleId,
            versionId: nextModule.versionId,
            resolved: nextModule,
            source: 'module-derived-next',
          };
        }
      }
    }

    // =========================================================================
    // 3. BÚSQUEDA POR CONTEXTO (tenant / cliente / región)
    // =========================================================================
    if (input.contextId) {
      const contextual = ModuleRegistry.list({
        contextId: input.contextId,
        enabledOnly: true,
      });

      if (contextual.length > 0) {
        return {
          moduleId: contextual[0].moduleId,
          versionId: contextual[0].versionId,
          resolved: contextual[0],
          source: 'context-match',
        };
      }
    }

    // =========================================================================
    // 4. BÚSQUEDA POR CANAL (web / mobile / discord / api)
    //    El PDF dice: “El módulo puede variar según canal”.
    // =========================================================================
    if (input.channel) {
      const byChannel = ModuleRegistry.list({
        enabledOnly: true,
      }).filter((m) =>
        m.blueprint?.architecture?.uiResponseContract?.metadata?.channels?.includes(input.channel)
      );

      if (byChannel.length > 0) {
        return {
          moduleId: byChannel[0].moduleId,
          versionId: byChannel[0].versionId,
          resolved: byChannel[0],
          source: 'channel-match',
        };
      }
    }

    // =========================================================================
    // 5. BÚSQUEDA POR TAGS SEMÁNTICAS
    //    El PDF dice: “clasificación por tags → filtrado”
    // =========================================================================
    if (input.tags && input.tags.length > 0) {
      const matches = ModuleRegistry.list({
        tags: input.tags,
        enabledOnly: true,
      });

      if (matches.length > 0) {
        return {
          moduleId: matches[0].moduleId,
          versionId: matches[0].versionId,
          resolved: matches[0],
          source: 'tag-match',
        };
      }
    }

    // =========================================================================
    // 6. INTENTION-BASED ROUTING (pequeña heurística)
    //    Dado que el PDF incluye clasificación semántica,
    //    permitimos reglas simples (ejemplos reales).
    // =========================================================================
    const lower = input.text.toLowerCase();

    if (lower.includes('onboarding')) {
      const onboarding = ModuleRegistry.getSmart('onboarding');
      if (onboarding) {
        return {
          moduleId: onboarding.moduleId,
          versionId: onboarding.versionId,
          resolved: onboarding,
          source: 'intent-onboarding',
        };
      }
    }

    if (lower.includes('diagnóstico') || lower.includes('diagnostico')) {
      const diag = ModuleRegistry.getSmart('diagnostico_empresarial');
      if (diag) {
        return {
          moduleId: diag.moduleId,
          versionId: diag.versionId,
          resolved: diag,
          source: 'intent-diagnostico',
        };
      }
    }

    if (lower.includes('documento') || lower.includes('pdf') || lower.includes('factura')) {
      const doc = ModuleRegistry.getSmart('document_processing');
      if (doc) {
        return {
          moduleId: doc.moduleId,
          versionId: doc.versionId,
          resolved: doc,
          source: 'intent-documents',
        };
      }
    }

    // =========================================================================
    // 7. Fallback: cargar un módulo estándar
    // =========================================================================
    const std = ModuleRegistry.getSmart('default');
    if (std) {
      return {
        moduleId: std.moduleId,
        versionId: std.versionId,
        resolved: std,
        source: 'fallback-default',
      };
    }

    // =========================================================================
    // FALLO TOTAL: no hay módulo adecuado
    // =========================================================================
    Logger.error('[ModuleRouter] No se pudo enrutar a ningún módulo.', input);

    return {
      moduleId: null,
      versionId: null,
      resolved: null,
      error: 'No se encontró módulo compatible',
      source: 'fatal',
    };
  }
}

export default ModuleRouter;
