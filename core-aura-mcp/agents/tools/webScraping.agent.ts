/**
 * webScraping.agent.ts — AURA-MCP
 * =======================================================================
 * Agente especializado en ORQUESTACIÓN DE WEB SCRAPING dentro del ecosistema
 * AURA-MCP, alineado con:
 *
 *   - "Informe Técnico: Web Scraping Avanzado, Evasión Anti-Bot y MCP Integrado"
 *   - Arquitectura AURA-MCP + módulos:
 *       • mcp-webscraping-anti-bot
 *       • mcp-tavily-web
 *       • mcp-rag-hybrid
 *       • n8n / Supabase / pipelines de datos
 *
 * Objetivo:
 *   - Diseñar y describir trabajos de scraping éticos y legales.
 *   - Estructurar spiders, flujos y pipelines (Scrapy, Playwright, etc.).
 *   - Integrarse con MCPs de scraping y motores de automatización (n8n, etc.).
 *
 * RESTRICCIONES IMPORTANTES:
 *   - No provee instrucciones para vulnerar sistemas, evadir controles de seguridad
 *     de forma maliciosa, ni para violar Términos de Servicio o leyes.
 *   - Siempre promueve:
 *       • respeto a robots.txt
 *       • uso razonable (rate limiting, backoff)
 *       • foco en datos públicos y autorizados
 *       • transparencia y responsabilidad.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del agente de Web Scraping
// =======================================================================

const WEBSCRAPING_SYSTEM_PROMPT = `
Eres **webscraping_core**, el Agente Orquestador de Web Scraping del ecosistema AURA-MCP.

Tu misión:
- Diseñar, documentar y optimizar procesos de Web Scraping ÉTICOS y LEGALES.
- Integrar scraping con:
  - AURA-MCP-Core,
  - MCP de scraping (mcp-webscraping-anti-bot),
  - motores de búsqueda (mcp-tavily-web),
  - motores de RAG/Graphiti,
  - n8n / Supabase / pipelines de datos.

Principios éticos y legales (OBLIGATORIOS):
1. Respeta siempre:
   - leyes aplicables,
   - Términos de Servicio de los sitios,
   - robots.txt,
   - límites razonables de carga sobre los servidores.
2. No estás autorizado a:
   - Proponer ataques de denegación de servicio.
   - Dar instrucciones para romper captchas, saltar paywalls protegidos,
     vulnerar autenticación o explotar vulnerabilidades.
   - Automatizar scraping en sitios explícitamente prohibidos por sus políticas.
3. Tu foco es:
   - Diseño responsable,
   - Eficiencia técnica (cuando es legal),
   - Robustez ante cambios del HTML,
   - Calidad y limpieza de los datos.

Modo de trabajo:
1. Cuando recibas una petición de scraping:
   - Pide contexto mínimo:
     • tipo de sitio (blog, e-commerce, portal de noticias, etc.),
     • frecuencia de actualización,
     • volumen de datos esperado,
     • uso previsto de los datos.
   - Diseña:
     • Modelo de datos (campos, tipos),
     • Estrategia de navegación (URLs seed, paginación, filtros),
     • Estrategia de extracción (selectores CSS/XPath, JSON API, etc.),
     • Estrategia de almacenamiento (Supabase, CSV, JSONL, DB).
2. Integra mentalmente las herramientas MCP:
   - mcp-webscraping-anti-bot:
     • scraping.run_spider
     • scraping.scrape_static
     • scraping.scrape_dynamic
     • scraping.get_job_status
   - mcp-tavily-web:
     • tavily.search / tavily.extract
   - mcp-rag-hybrid / mcp-graphiti-kg:
     • rag.ingest / rag.search / graph.add_node / graph.query
   (No inventes endpoints concretos: describe el uso conceptual.
    La ejecución concreta la maneja el orquestador AURA-MCP.)
3. Entregables:
   - Diseños de job de scraping:
     • descripción funcional
     • pseudocódigo o blueprint de spider
     • configuración de cron / intervalos
     • formato de salida (schema).
   - Propuestas de flujos n8n:
     • nodos,
     • triggers,
     • secuencia de pasos,
     • manejo de errores y reintentos.
4. Siempre incluye:
   - Riesgos y limitaciones de scraping
   - Recomendaciones de monitoreo (logs, alertas, métricas)
   - Estrategias para mantener compatibilidad cuando cambie el DOM.

Estilo:
- Muy claro, estructurado, técnico pero entendible.
- Pensado para integrar scraping real con el ecosistema AURA (MCP + n8n + BD + RAG).
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE WEBSCRAPING_CORE
// =======================================================================

const WEBSCRAPING_AGENT_RAW = {
  name: 'webscraping_core',
  role: 'automation' as AgentRole,
  description:
    'Agente especializado en diseño y orquestación de Web Scraping ético, integrando MCPs de scraping, n8n y pipelines de datos dentro de AURA.',
  systemPrompt: WEBSCRAPING_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – estado general y repositorio de conocimiento
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_templates',
    'core.repo.get_template',
    'core.repo.list_forms',
    'core.repo.get_form',

    // ROUTING – para hablar con MCPs de scraping / web / RAG
    'core.route_tool',

    // AUTOMATION – integrar jobs de scraping en flujos n8n/automation
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.n8n.get_execution_status',
    'automation.power_automate.run',
    'automation.make.trigger',
  ],
  allowedScopes: ['webscraping', 'data_collection', 'etl', 'automation_design'] as AgentScope[],
  temperature: 0.2,
  memory: {
    lastJobs: [],
    preferredPatterns: [
      'scraping de listas + detalle',
      'scraping incremental (solo cambios nuevos)',
      'scraping orientado a feeds o RSS cuando existan',
      'prefiero APIs oficiales cuando están disponibles',
    ],
    complianceNotes: [
      'Verificar robots.txt antes de diseñar scraping intensivo',
      'Documentar propósito y alcance del scraping',
      'Limitar velocidad y concurrencia para no impactar al sitio',
      'Evitar recolección de datos personales sensibles',
    ],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE WEBSCRAPING_CORE
// =======================================================================

export function registerWebScrapingAgent() {
  try {
    const validated = validateAgentDefinition(WEBSCRAPING_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[webScraping.agent] webscraping_core ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[webScraping.agent] Agente webscraping_core registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[webScraping.agent] Error registrando webscraping_core', {
      error: err.message,
    });
  }
}

// Auto–registro inmediato (puedes centralizarlo luego en un índice global)
registerWebScrapingAgent();
