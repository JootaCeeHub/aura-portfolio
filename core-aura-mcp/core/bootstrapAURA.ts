/**
 * bootstrapAURA.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Punto de arranque del AURA-MCP-CORE.
 *
 * Responsabilidades:
 *  ✔ Auto-registrar agentes desde /agents/**
 *  ✔ Cargar plantillas de prompts (PromptTemplateRegistry)
 *  ✔ Aplicar políticas de prompts (PromptPolicyEngine indirectamente)
 *  ✔ Inyectar systemPrompts finales por agente (AgentPromptInjector)
 *  ✔ Cargar Knowledge Packs (embeddings + grafos)
 *  ✔ Cargar tools MCP remotas (MCPToolLoader)
 *  ✔ Dejar listo RAGOrchestrator / GraphRAG / SemanticLinker
 *
 * Este módulo NO ejecuta peticiones de usuario:
 *  → solo prepara el ecosistema para que el OrchestratorCore y el PipelineEngine
 *    puedan trabajar de forma robusta.
 */

import { Logger } from '../src/lib/logger.js';

// Core de agentes y prompts
import { AgentManager } from '../agents/core/agentManager.js';
import { AgentPromptInjector } from './AgentPromptInjector.js';
import { PromptTemplateRegistry } from './PromptTemplateRegistry.js';

// Auto-registro de agentes (lee /agents/**)
import { AutoRegisterAgents } from '../agents/core/autoRegisterAgents.js';

// RAG + GraphRAG
import { KnowledgePackLoader } from './KnowledgePackLoader.js';
import { SemanticLinker } from './SemanticLinker.js';
import { GraphRAGQueryEngine } from './GraphRAGQueryEngine.js';
import { RAGOrchestrator } from './RAGOrchestrator.js';

// MCP Tools
import { MCPToolLoader } from './mcpToolLoader.js';

// Cache de embeddings
import { EmbeddingCache } from './EmbeddingCache.js';

// Opcional: PipelineEngine (para asegurar que esté cargado)
// import { PipelineEngine } from "./PipelineEngine.js";

// ============================================================================
// 1. Tipos de configuración
// ============================================================================

export interface AURABootstrapOptions {
  /**
   * Directorio base de Knowledge Packs (ej: "knowledge_packs/")
   */
  knowledgePackDir?: string;

  /**
   * Directorio base de plantillas de prompt (ej: "prompts/templates/")
   */
  promptTemplatesDir?: string;

  /**
   * Si true, intenta enlazar semánticamente todos los packs entre sí
   * usando SemanticLinker.
   */
  autoSemanticLinking?: boolean;

  /**
   * Modo debug → logs más verbosos.
   */
  debug?: boolean;
}

export interface AURABootstrapResult {
  agentsRegistered: number;
  promptsInjected: number;
  knowledgePacksLoaded: number;
  semanticLinks?: any;
  mcpToolsLoaded: number;
  embeddingCacheStats: ReturnType<typeof EmbeddingCache.getStats>;
  ready: boolean;
}

// ============================================================================
// 2. Función principal de bootstrap
// ============================================================================

export async function bootstrapAURA(
  options: AURABootstrapOptions = {}
): Promise<AURABootstrapResult> {
  const {
    knowledgePackDir,
    promptTemplatesDir,
    autoSemanticLinking = false,
    debug = false,
  } = options;

  Logger.info('[AURA_BOOTSTRAP] Iniciando bootstrap del AURA-MCP-Core', {
    knowledgePackDir,
    promptTemplatesDir,
    autoSemanticLinking,
  });

  // --------------------------------------------------------------------------
  // 1. Cargar plantillas de prompts (si existe carpeta)
  // --------------------------------------------------------------------------
  if (promptTemplatesDir) {
    try {
      PromptTemplateRegistry.loadFromDirectory(promptTemplatesDir);
      Logger.info('[AURA_BOOTSTRAP] Plantillas de prompt cargadas', {
        dir: promptTemplatesDir,
      });
    } catch (err: any) {
      Logger.error('[AURA_BOOTSTRAP] Error al cargar templates', {
        error: err.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. Auto-registrar agentes desde la carpeta /agents/**
  // --------------------------------------------------------------------------
  const autoRegResult = AutoRegisterAgents.load();

  const agentsRegistered = autoRegResult?.totalAgents ?? 0;

  Logger.info('[AURA_BOOTSTRAP] Agentes auto-registrados', {
    total: agentsRegistered,
    errors: autoRegResult?.errors?.length ?? 0,
  });

  // --------------------------------------------------------------------------
  // 3. Inyectar systemPrompts finales a todos los agentes
  // --------------------------------------------------------------------------
  let promptsInjected = 0;
  try {
    const listFn = (AgentManager as any).list;
    const agents = typeof listFn === 'function' ? (listFn() as any[]) : [];

    agents.forEach((a) => {
      AgentPromptInjector.injectIntoAgent(a.name, {
        debug,
        data: {
          entorno: 'AURA-MCP-Core',
          owner: 'Mr. Jacob',
          project: 'AURA-MCP-CORE-Definitivo',
        },
      });
      promptsInjected++;
    });

    Logger.info('[AURA_BOOTSTRAP] SystemPrompts inyectados a agentes', {
      total: promptsInjected,
    });
  } catch (err: any) {
    Logger.error('[AURA_BOOTSTRAP] Error inyectando prompts a agentes', {
      error: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // 4. Cargar Knowledge Packs (RAG + Grafos)
  // --------------------------------------------------------------------------
  let knowledgePacksLoaded = 0;
  let semanticLinks: any = null;

  if (knowledgePackDir) {
    try {
      const packs = await KnowledgePackLoader.loadAllPacks(knowledgePackDir);
      knowledgePacksLoaded = packs.length;

      Logger.info('[AURA_BOOTSTRAP] Knowledge Packs cargados', {
        totalPacks: packs.length,
      });

      // Opcional: auto linking semántico entre packs
      if (autoSemanticLinking && packs.length > 1) {
        const packIds = packs.map((p) => p.packId);
        const root = packIds[0];

        semanticLinks = await SemanticLinker.linkPackAgainstAll(root, packIds, {
          similarityThreshold: 0.82,
          maxLinks: 50,
          relation: 'cross_pack',
        });

        Logger.info('[AURA_BOOTSTRAP] Enlace semántico entre packs completado');
      }
    } catch (err: any) {
      Logger.error('[AURA_BOOTSTRAP] Error cargando Knowledge Packs', {
        error: err.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 5. Cargar tools MCP remotas
  // --------------------------------------------------------------------------
  let mcpToolsLoaded = 0;
  try {
    const tools = await MCPToolLoader.loadAllTools();
    mcpToolsLoaded = tools.length;

    Logger.info('[AURA_BOOTSTRAP] Tools MCP cargadas', {
      total: mcpToolsLoaded,
    });
  } catch (err: any) {
    Logger.error('[AURA_BOOTSTRAP] Error al cargar MCP tools', {
      error: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // 6. Inicializar motores de RAG/GraphRAG (touch para asegurar bootstrap)
  // --------------------------------------------------------------------------
  try {
    // Pequeñas llamadas "noop" para asegurar que los módulos se inicialicen
    await RAGOrchestrator.run('ping', { topK: 1 });
    await GraphRAGQueryEngine.query('ping', { topK: 1, explanation: false });

    Logger.info('[AURA_BOOTSTRAP] Motores RAG/GraphRAG inicializados.');
  } catch (err: any) {
    Logger.warn('[AURA_BOOTSTRAP] No se pudo inicializar RAG/GraphRAG completamente', {
      error: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // 7. Cache de embeddings — solo leemos stats al final
  // --------------------------------------------------------------------------
  const embeddingCacheStats = EmbeddingCache.getStats();

  // --------------------------------------------------------------------------
  // 8. Dejar huella global de bootstrap
  // --------------------------------------------------------------------------
  (globalThis as any).AURA_BOOTSTRAPPED = true;
  (globalThis as any).AURA_BOOTSTRAP_INFO = {
    agentsRegistered,
    promptsInjected,
    knowledgePacksLoaded,
    mcpToolsLoaded,
    embeddingCacheStats,
  };

  Logger.info('[AURA_BOOTSTRAP] AURA-MCP-Core listo para operar ✅', {
    agentsRegistered,
    promptsInjected,
    knowledgePacksLoaded,
    mcpToolsLoaded,
  });

  return {
    agentsRegistered,
    promptsInjected,
    knowledgePacksLoaded,
    semanticLinks,
    mcpToolsLoaded,
    embeddingCacheStats,
    ready: true,
  };
}

// ============================================================================
// 3. Bootstrap automático opcional
// ============================================================================

/**
 * Si quieres que el bootstrap se ejecute automáticamente cuando se importe
 * este módulo, puedes descomentar esto en entornos controlados:
 *
 *   bootstrapAURA({ ... }).catch(console.error);
 *
 * Pero en producción es mejor llamarlo explícitamente desde tu entrypoint.
 */

export default bootstrapAURA;
