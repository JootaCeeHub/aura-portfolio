/**
 * analyst.agent.ts — AURA-MCP
 * ===================================================================
 * Definición de agentes de ANÁLISIS para el ecosistema AURA:
 *
 *  - analyst_core   → Analista de datos / negocio generalista
 *  - analyst_stats  → Analista estadístico / cuantitativo
 *
 * Rol principal:
 *  - Entender datos tabulares, métricas de negocio, KPIs, operaciones.
 *  - Formular hipótesis, interpretar resultados, detectar anomalías.
 *  - Proponer decisiones accionables basadas en evidencia.
 *
 * Integración:
 *  - AgentManager v3  (registro + memoria + roles)
 *  - agentSchemas     (validación formal)
 *  - PipelineEngine   (puede usar analyst_core como target principal)
 *  - LangChainExecutor / AURA_TOOLKIT (uso de tools core + MCP)
 */

import { AgentManager } from '../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../adapters/agentSchemas.js';
import { Logger } from '../../src/lib/logger.js';

// -------------------------------------------------------------------
// 1. Definición base de prompts para agentes Analyst
// -------------------------------------------------------------------

const ANALYST_CORE_SYSTEM_PROMPT = `
Eres **analyst_core**, el Analista Principal de Datos y Negocio del ecosistema AURA-MCP.

Tu misión es:
- Entender el contexto de negocio del usuario (operaciones, logística, ventas, automatización, IA).
- Analizar datos tabulares, métricas y KPIs (Excel, SQL, dashboards, reportes).
- Formular hipótesis claras, estructuradas y basadas en evidencia.
- Entregar conclusiones accionables, priorizadas y justificadas.
- Recomendar automatizaciones (n8n, Power Automate, MCPs) cuando mejoren eficiencia.

Instrucciones centrales:
1. Siempre pide aclaraciones mínimas si faltan datos críticos, pero evita bloquear la respuesta.
2. Estructura tus respuestas en secciones:
   - Contexto interpretado
   - Análisis
   - Riesgos / supuestos
   - Recomendaciones concretas (con pasos)
3. Cuando se trate de datos:
   - Si vienen en texto, intenta tabular mentalmente.
   - Si son grandes volúmenes, sugiere cómo cargarlos (Excel, SQL, RAG, etc.).
4. Si detectas posibles automatizaciones:
   - Relaciónalas con workflows en n8n, Power Automate o MCPs relevantes (sin inventar endpoints específicos).
5. Mantén un tono profesional, claro y orientado a la toma de decisiones.

No inventes datos numéricos. Si necesitas hacer supuestos, decláralos explícitamente.
`.trim();

const ANALYST_STATS_SYSTEM_PROMPT = `
Eres **analyst_stats**, Analista Estadístico y Cuantitativo del ecosistema AURA-MCP.

Tu foco es:
- Análisis estadístico descriptivo y exploratorio.
- Pruebas de hipótesis sencillas (cuando aplique).
- Interpretación de correlaciones, tendencias y patrones.
- Asistir en diseño de métricas, indicadores y modelos básicos.

Instrucciones:
1. Explica los conceptos técnicos en lenguaje accesible.
2. Indica siempre:
   - Qué se puede concluir.
   - Qué NO se puede concluir (limitaciones de los datos).
3. Cuando el usuario pregunte por modelos avanzados (regresión, clustering, etc.),
   ayúdale a definir:
   - Variables relevantes.
   - Preparación de datos.
   - Enfoque sugerido (sin código si no lo pide directamente).
4. Siempre que sea posible, conecta tus recomendaciones con:
   - Excel / Power BI / SQL
   - Potenciales automatizaciones (n8n, Power Automate).

No inventes resultados. Trabaja con los datos y supuestos explícitos.
`.trim();

// -------------------------------------------------------------------
// 2. Lista de agentes a registrar
// -------------------------------------------------------------------

const ANALYST_AGENTS_RAW = [
  {
    name: 'analyst_core',
    role: 'analyst' as AgentRole,
    description:
      'Analista principal de datos y negocio para el ecosistema AURA-MCP. Interpreta métricas, KPIs y datos operacionales.',
    systemPrompt: ANALYST_CORE_SYSTEM_PROMPT,
    allowedTools: [
      // Core
      'core.get_status',
      'core.list_servers',
      'core.sql.query',
      'core.sql.select',
      'core.repo.get_knowledge',
      'core.repo.get_prompt',
      // Automatización
      'automation.n8n.list_workflows',
      'automation.n8n.run_workflow',
      // (otros tools se pueden agregar según vayas implementando MCPs)
    ],
    allowedScopes: ['analytics', 'business_intel', 'operations', 'reporting'] as unknown as AgentScope[],
    temperature: 0.2,
  },
  {
    name: 'analyst_stats',
    role: 'analyst' as AgentRole,
    description:
      'Analista estadístico y cuantitativo orientado a métricas, tendencias y validación numérica.',
    systemPrompt: ANALYST_STATS_SYSTEM_PROMPT,
    allowedTools: [
      'core.sql.query',
      'core.sql.select',
      'core.repo.get_knowledge',
      // Si más adelante creas un MCP de estadística:
      // "mcp__mcp-estadistica__stats.describe",
      // "mcp__mcp-estadistica__stats.correlation",
    ],
    allowedScopes: ['analytics', 'statistics', 'reporting'] as unknown as AgentScope[],
    temperature: 0.1,
  },
];

// -------------------------------------------------------------------
// 3. Función de registro — se puede invocar desde un index de agentes
// -------------------------------------------------------------------

export function registerAnalystAgents() {
  for (const raw of ANALYST_AGENTS_RAW) {
    try {
      const validated = validateAgentDefinition({
        ...raw,
        memory:
          raw.name === 'analyst_core'
            ? { focus: 'business_kpi', lastDatasets: [] }
            : { focus: 'stats', lastAnalyses: [] },
      });

      // Evitar doble registro si este módulo se importa dos veces
      if (AgentManager.get(validated.name)) {
        Logger.info('[analyst.agent] Agente ya registrado, se omite', {
          name: validated.name,
        });
        continue;
      }

      AgentManager.register(validated);
    } catch (err: any) {
      // No dejamos caer el core por un agente mal definido
      // pero lo dejamos registrado en logs
      // (puede servir muchísimo para debug)
      Logger.error('[analyst.agent] Error registrando agente', {
        name: raw.name,
        error: err.message,
      });
    }
  }
}

// -------------------------------------------------------------------
// 4. Auto-registro opcional (side-effect)
// -------------------------------------------------------------------
//
// Si prefieres control explícito, comenta esta línea y llama a
// registerAnalystAgents() desde un index de agentes o desde main.ts
// después de inicializar el Core.
//

registerAnalystAgents();
