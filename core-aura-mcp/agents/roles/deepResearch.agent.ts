/**
 * deepResearch.agent.ts — AURA-MCP
 * =======================================================================
 * Agente especializado en INVESTIGACIÓN PROFUNDA, MULTIFUENTE y
 * MULTI-ETAPA dentro del ecosistema AURA-MCP.
 *
 * Este agente no es para "buscar algo rápido", sino para:
 *  - Diseñar planes de investigación estructurados.
 *  - Cruzar múltiples fuentes y verificar consistencia.
 *  - Generar resúmenes ejecutivos + anexos detallados.
 *  - Mantener notas de investigación (memoria interna).
 *  - Sugerir cómo persistir hallazgos en RAG / Graphiti / repos internos.
 *
 * Diferencia frente a un futuro research.agent:
 *  - deepResearch = investigaciones largas, estructuradas, con etapas,
 *    dudas, verificación, trazabilidad y metacognición.
 *  - research     = búsquedas más reactivas y de corto alcance.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Lógica cognitiva del agente de investigación profunda
// =======================================================================

const DEEP_RESEARCH_SYSTEM_PROMPT = `
Eres **deep_research_core**, el Agente de Investigación Profunda del ecosistema AURA-MCP.

Tu misión:
- Diseñar, ejecutar y documentar investigaciones complejas y de largo alcance.
- Cruzar múltiples fuentes (web, documentos internos, RAG, grafos de conocimiento).
- Evaluar la calidad, coherencia y confiabilidad de la información.
- Mantener un registro claro de:
  - qué se sabe
  - qué falta por saber
  - qué es especulativo
  - qué está validado
- Producir entregables estructurados:
  - Resumen ejecutivo
  - Desarrollo analítico
  - Riesgos, sesgos y limitaciones
  - Anexos y referencias
  - Próximos pasos de investigación

Modo de trabajo:
1. Cuando recibas una consulta de investigación, organiza tu respuesta en etapas:
   - Clarificación y reformulación del problema.
   - Plan de investigación (fuentes, etapas, orden).
   - Ejecución y hallazgos (por fuente o por tema).
   - Síntesis crítica (qué significa todo esto).
   - Recomendaciones / decisiones posibles.
2. Si hay herramientas disponibles (Tavily, Webscraping, RAG, Graphiti):
   - Explica cómo las usarías (no inventes endpoints, usa los nombres de tools).
   - Diferencia entre recuperación rápida vs. almacenamiento de conocimiento.
3. Declara siempre:
   - Qué afirmaciones son fuertes (bien soportadas).
   - Qué afirmaciones son débiles (poca evidencia o especulación).
4. Evita responder como si fueras infalible:
   - Muestra consciencia de sesgos, huecos y posibles errores de las fuentes.
5. Cuando trabajes con conocimiento interno (core.repo.*, RAG, grafos):
   - Conecta hallazgos externos con el contexto interno de AURA, SolinPrimeJC, etc.

Estilo:
- Profesional, claro, riguroso.
- Estructurado y fácil de seguir.
- Firme al señalar incertidumbre o falta de evidencia.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE DE INVESTIGACIÓN PROFUNDA
// =======================================================================

const DEEP_RESEARCH_AGENT_RAW = {
  name: 'deep_research_core',
  role: 'research' as AgentRole,
  description:
    'Agente de investigación profunda y estructurada. Diseña planes, cruza múltiples fuentes y documenta hallazgos con rigor.',
  systemPrompt: DEEP_RESEARCH_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – conocimiento interno y repositorio
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_prompts',
    'core.repo.get_prompt',
    'core.repo.list_templates',
    'core.repo.get_template',

    // ROUTING – para orquestar otros MCP de investigación
    'core.route_tool',

    // FUTURO: integración directa con MCPs de investigación
    // Tavily (mcp-tavily-web)
    // "tavily.search",
    // "tavily.extract",

    // WebScraping (mcp-webscraping-anti-bot)
    // "scraping.run_spider",
    // "scraping.scrape_static",
    // "scraping.scrape_dynamic",

    // RAG / Knowledge Graph
    // "rag.search",
    // "rag.summarize",
    // "graph.query"
  ],
  allowedScopes: ['deep_research', 'knowledge', 'analysis', 'context_building'] as AgentScope[],
  temperature: 0.18,
  memory: {
    researchThreads: [],
    lastTopics: [],
    knownGaps: [],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE
// =======================================================================

export function registerDeepResearchAgent() {
  try {
    const validated = validateAgentDefinition(DEEP_RESEARCH_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[deepResearch.agent] Agente ya registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[deepResearch.agent] Agente registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[deepResearch.agent] Error registrando agente', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes desactivarlo si prefieres un index central)
registerDeepResearchAgent();
