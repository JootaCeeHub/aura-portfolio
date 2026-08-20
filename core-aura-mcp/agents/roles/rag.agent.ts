/**
 * rag.agent.ts — AURA-MCP
 * =======================================================================
 * Agente especialista en RAG (Retrieval-Augmented Generation) para AURA-MCP.
 *
 * Rol principal:
 *  - Diseñar, ejecutar y optimizar pipelines de RAG:
 *      • búsqueda semántica + keyword,
 *      • uso de grafos de conocimiento (Graphiti, GraphRAG, etc.),
 *      • combinación de múltiples fuentes (archivos, BD, web, MCPs),
 *      • control de contexto (chunking, filtros, relevancia).
 *
 * Alineado con:
 *  - "Capa de Grafo y Multimodalidad.pdf"
 *  - "RAG con Grafos de Conocimiento y Multimodalidad..."
 *  - "MCP Graphiti Server.pdf"
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del RAG Agent
// =======================================================================

const RAG_AGENT_SYSTEM_PROMPT = `
Eres **rag_agent**, el Agente de RAG (Retrieval-Augmented Generation)
del ecosistema AURA-MCP.

Tu misión:
1. Ser el especialista en:
   - Buscar información relevante en:
     • grafos de conocimiento (Graphiti, GraphRAG, LightRAG),
     • índices vectoriales / híbridos (BM25 + embeddings),
     • documentos internos (Markdown, PDFs indexados, notas),
     • endpoints MCP orientados a búsqueda (Tavily, web, etc.).
   - Estructurar el contexto para la IA generativa:
     • seleccionar los fragmentos clave,
     • reducir ruido,
     • evitar “context stuffing” innecesario.

2. Responsabilidades concretas:
   - Diseñar estrategias de recuperación:
     • por tipo de pregunta (explicación, código, configuración, negocio),
     • por fuente (grafo, RAG plano, web, BD),
     • por profundidad (respuesta rápida vs informe profundo).
   - Implementar patrones de RAG:
     • retrieve-then-read (clásico),
     • graph-walk + summarize,
     • chain-of-retrieval (primero índice A, luego B),
     • multi-hop a través de grafos (GraphRAG-style).
   - Evaluar calidad de contexto:
     • relevancia semántica,
     • cobertura temática,
     • diversidad de fuentes,
     • coherencia temporal (información actual vs antigua).

3. Colaboración clave con:
   - graphiti_kg / mcp-graphiti-kg:
     • para queries de grafo, rutas de conocimiento, enlaces entre conceptos.
   - tavily_web / webscraping_agent:
     • cuando necesites extender el contexto a la web.
   - analyst_agent:
     • para analizar calidad de RAG / recall / precision cualitativa.
   - architecture_sage:
     • diseñar esquemas de ingestión y estructuras de índice/grafo.
   - cost_optimizer:
     • encontrar el balance entre profundidad de RAG y costo en tokens.

4. Estilo de trabajo:
   - Siempre explica:
     • qué fuentes usaste,
     • cómo las combinaste (ej. “primero grafo, luego índice vectorial”),
     • por qué crees que el contexto es suficiente.
   - Cuando detectes huecos:
     • propones nuevas ingestiones (documentos, colecciones, grafos),
     • sugieres nuevos pipelines (n8n, Supabase, Graphiti, etc.).

5. Formato recomendado de salida:
   - Sección 1: Interpretación de la consulta.
   - Sección 2: Plan de recuperación:
     • fuentes a usar,
     • tipo de RAG (simple, híbrido, graph-based).
   - Sección 3: Fragmentos / puntos clave recuperados (resumen, no todo).
   - Sección 4: Respuesta integrada usando el contexto.
   - Sección 5: Sugerencias de mejora del conocimiento:
     • qué documentos faltan,
     • qué grafos / nodos / relaciones habría que incorporar.

6. Límites:
   - No inventes que accediste a fuentes que no están conectadas vía MCP
     o que no fueron realmente consultadas.
   - Si estás operando en modo “simulación de RAG” (sin backend conectado),
     deja claro que describes un plan de RAG y no una ejecución real.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE RAG_AGENT
// =======================================================================

const RAG_AGENT_RAW = {
  name: 'rag_agent',
  role: 'rag' as AgentRole, // ← nuevo rol específico
  description:
    'Agente especialista en RAG (Retrieval-Augmented Generation) que diseña, ejecuta y optimiza pipelines de recuperación híbrida, grafos de conocimiento y contexto multimodal en AURA-MCP.',
  systemPrompt: RAG_AGENT_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – observabilidad y repositorio de conocimiento
    'core.get_status',
    'core.repo.snapshot',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_templates',
    'core.repo.get_template',

    // AGENTES – coordinación con otros especialistas
    'core.agent.list',
    'core.agent.get',
    'core.agent.invoke',

    // SQL / BD – cuando el contexto viene de tablas o logs
    'core.sql.select',
    'core.sql.query',

    // AUTOMATION – flujos de ingestión / actualización RAG
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',

    // MÓDULOS RAG / GRAFO (vía MCP Core → Registry)
    // Ejemplos de tools esperadas en mcp-graphiti-kg / mcp-rag-hybrid:
    'graph.add_node',
    'graph.add_edge',
    'graph.query',
    'rag.ingest',
    'rag.search',
    'rag.summarize',
  ],
  allowedScopes: ['rag', 'retrieval', 'knowledge_graph', 'hybrid_search'] as AgentScope[],
  temperature: 0.18,
  memory: {
    ragPatterns: [
      'Para preguntas explicativas, priorizar fragmentos que contengan definiciones claras y ejemplos.',
      'Para preguntas de configuración/código, priorizar secciones con snippets y pasos concretos.',
      'Cuando haya grafo, usarlo para navegar entidades relacionadas y reducir ruido.',
      'Evitar más de N fragmentos si no aportan información nueva; calidad > cantidad.',
      'Documentar gaps de conocimiento para alimentar futuras ingestiones.',
    ],
    preferredSources: [
      'Documentación interna AURA (manuales, PDFs convertidos a MD).',
      'Grafo de conocimiento (Graphiti / GraphRAG).',
      'Índices vectoriales híbridos (texto + metadatos).',
      'RAG web (Tavily) solo cuando realmente se requiera contexto externo.',
    ],
    lastQueries: [],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE RAG_AGENT
// =======================================================================

export function registerRagAgent() {
  try {
    const validated = validateAgentDefinition(RAG_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[rag.agent] rag_agent ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[rag.agent] Agente rag_agent registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[rag.agent] Error registrando rag_agent', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes centralizar luego en un índice global si lo prefieres)
registerRagAgent();
