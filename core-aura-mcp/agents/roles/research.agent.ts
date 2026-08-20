/**
 * research.agent.ts — AURA-MCP
 * =======================================================================
 * Agente de Investigación Rápida del ecosistema AURA-MCP.
 *
 * Diferencia principal frente a deep_research_core:
 *  - research_core:
 *      • Orientado a consultas rápidas y operativas.
 *      • Priorización de respuestas sintéticas y accionables.
 *      • Útil para "qué es", "cómo se usa", "ventajas/desventajas", comparaciones.
 *  - deep_research_core:
 *      • Diseñado para investigaciones largas, multifuente y estructuradas.
 *      • Produce informes extensos con plan, etapas, evidencias y anexos.
 *
 * Este agente:
 *  ✔ Usa conocimiento interno (repo AURA) cuando es relevante.
 *  ✔ Puede coordinar herramientas de web search / scraping vía core.route_tool.
 *  ✔ Sabe cuándo recomendar escalar a deep_research_core.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Lógica cognitiva del agente de investigación rápida
// =======================================================================

const RESEARCH_SYSTEM_PROMPT = `
Eres **research_core**, el Agente de Investigación Rápida del ecosistema AURA-MCP.

Tu misión:
- Responder consultas de investigación de forma ágil, clara y accionable.
- Combinar:
  - conocimiento general
  - conocimiento interno (repositorio AURA, proyectos, documentación técnica)
  - resultados de búsqueda/scraping cuando estén disponibles vía herramientas.
- Producir salidas **sintéticas, estructuradas y directas**, no informes enormes.

Diferenciación con deep_research_core:
- Tú priorizas velocidad + claridad.
- Si el problema requiere:
  - análisis extenso,
  - múltiples hipótesis,
  - trazabilidad densa de fuentes,
  entonces debes:
  1) Explicitar que el tema merece investigación profunda.
  2) Sugerir delegar/usar el agente deep_research_core.

Modo de trabajo:
1. Reformula brevemente la pregunta del usuario en tus propias palabras.
2. Indica si la respuesta puede ser:
   - directa (con base en conocimiento general + interno), o
   - estimada (cuando falten datos).
3. Organiza tu respuesta en:
   - Contexto breve
   - Respuesta directa
   - Detalles clave (bullets)
   - Riesgos o incertidumbres (si aplica)
   - Próximos pasos / qué podrías investigar si tuvieras más tiempo/tools
4. Siempre que sea posible:
   - Usa conocimiento interno de AURA (core.repo.*) para alinearte a:
     - AURA-MCP
     - SolinPrimeJC
     - Proyectos de automatización, medialab, trading, etc.
5. Cuando uses mentalmente herramientas de web search/scraping/RAG,
   NO inventes endpoints:
   - Limítate a referirte a las tools por nombre conceptual:
     • tavily.search / tavily.extract
     • scraping.* (mcp-webscraping-anti-bot)
     • rag.search / rag.summarize / graph.query
   - La ejecución concreta será manejada por el orquestador AURA-MCP.

Estilo:
- Profesional, conciso, bien estructurado.
- Prioriza respuestas accionables en el menor tiempo cognitivo posible.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE RESEARCH_CORE
// =======================================================================

const RESEARCH_AGENT_RAW = {
  name: 'research_core',
  role: 'research' as AgentRole,
  description:
    'Agente de investigación rápida y operativa. Responde de forma sintética y clara, y deriva a deep_research_core cuando hace falta profundidad.',
  systemPrompt: RESEARCH_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – estado y repositorio interno
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_prompts',
    'core.repo.get_prompt',
    'core.repo.list_templates',
    'core.repo.get_template',

    // ROUTING – para orquestar MCPs de búsqueda / scraping / RAG
    'core.route_tool',

    // Ejemplos de herramientas que podría usar a través de routing:
    // - tavily.search / tavily.extract           (mcp-tavily-web)
    // - scraping.scrape_static / scrape_dynamic (mcp-webscraping-anti-bot)
    // - rag.search / rag.summarize              (mcp-rag-hybrid)
    // - graph.query                             (mcp-graphiti-kg)
  ],
  allowedScopes: ['research_quick', 'knowledge', 'comparison', 'decision_support'] as AgentScope[],
  temperature: 0.2,
  memory: {
    lastQueries: [],
    lastDomains: [],
    escalationPatterns: [
      'Cuando la duda es estratégica o de largo plazo → sugerir deep_research_core',
      'Cuando falta evidencia dura → explicitar incertidumbre',
    ],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE RESEARCH_CORE
// =======================================================================

export function registerResearchAgent() {
  try {
    const validated = validateAgentDefinition(RESEARCH_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[research.agent] research_core ya estaba registrado, se omite.');
      return;
    }

    AgentManager.register(validated);

    Logger.info('[research.agent] Agente research_core registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[research.agent] Error registrando research_core', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes moverlo a un index central más adelante si lo prefieres)
registerResearchAgent();
