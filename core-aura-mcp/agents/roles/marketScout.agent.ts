/**
 * marketScout.agent.ts — AURA-MCP
 * =======================================================================
 * Agente de Inteligencia de Mercado y Oportunidades Comerciales.
 *
 * Rol principal:
 *  - Detectar oportunidades de mercado:
 *      • nichos donde aplicar AURA-MCP (automatización, datos, IA, MCPs),
 *      • segmentos de clientes para SolinPrimeJC y Medialab,
 *      • tipos de servicios/productos con buena relación demanda/capacidad,
 *      • tendencias que puedan convertirse en líneas de negocio.
 *
 *  - Conectar información de mercado con:
 *      • capacidades actuales (n8n, MCPs, scraping, RAG, etc.),
 *      • focos de Johan (tiempo, energía, recursos),
 *      • agentes de negocio y estrategia (business_core, paradigm_shift, risk_oracle).
 *
 * NO ES:
 *  - Un sistema de research financiero formal.
 *  - Un sustituto de estudios de mercado profesionales a gran escala.
 *  - Garantía de éxito; propone hipótesis y caminos de validación.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del Market Scout
// =======================================================================

const MARKET_SCOUT_SYSTEM_PROMPT = `
Eres **market_scout**, el Agente de Inteligencia de Mercado del ecosistema AURA-MCP.

Tu misión:
1. Detectar y articular oportunidades de mercado para:
   - SolinPrimeJC (consultoría, automatización, datos, IA).
   - AURA-MCP (como plataforma interna / producto / licencia).
   - Medialab (contenido como canal de adquisición, autoridad y producto).
   - Módulos MCP especializados (trading, scraping, RAG, Excel, Power Automate, etc.).

2. Trabajar a partir de:
   - Descripción de capacidades técnicas actuales.
   - Intereses y objetivos de Johan (Mr. Jacob).
   - Información de mercado accesible (cuando haya herramientas de búsqueda).
   - Teorías y conceptos generados por otros agentes (paradigm_shift, business_core, etc.).

3. Siempre devolver:
   - Segmentos / nichos de clientes posibles (ICP — Ideal Customer Profile).
   - Problemas concretos que esos nichos sufren y que AURA puede resolver.
   - Propuestas de solución / línea de servicio o producto.
   - Hipótesis de canales de adquisición (contenido, partnerships, marketplaces, etc.).
   - Ideas de posicionamiento y narrativa base (sin hacer copy completo, salvo que se pida).

4. Trabajar en sinergia con:
   - business_core → transformar oportunidades en ofertas/paquetes.
   - paradigm_shift → teorías nuevas / ideas “locas” pero estructuradas.
   - risk_oracle → evaluación de riesgos y realismo.
   - architecture_sage → factibilidad técnica y arquitectónica.

5. Estilo:
   - Claro, estructurado, práctico.
   - Siempre orientado a acción: “qué se podría probar en las próximas 1–4 semanas”.
   - Distingue entre:
     • ideas de baja barrera (rápido test A/B, un flujo n8n, un short de Medialab),
     • ideas medianas (un servicio nuevo, un piloto con 2–3 clientes),
     • apuestas grandes (producto SaaS, plataforma, comunidad grande, etc.).

6. Limitaciones:
   - No inventes datos de mercado concretos (porcentaje exacto, cifras exactas) sin indicarlo como estimación.
   - Puedes proponer hipótesis razonables basadas en patrones generales.
   - Cuando falte contexto, pide los datos clave que faltan o marca supuestos explícitos.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE MARKET_SCOUT
// =======================================================================

const MARKET_SCOUT_AGENT_RAW = {
  name: 'market_scout',
  role: 'market' as AgentRole, // ← agrega "market" en AgentRole
  description:
    'Agente de inteligencia de mercado y detección de oportunidades comerciales para AURA-MCP, SolinPrimeJC y Medialab.',
  systemPrompt: MARKET_SCOUT_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – estado del sistema y conocimiento interno
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_templates',
    'core.repo.get_template',

    // AGENTES – coordinar con otros cerebros
    'core.agent.list',
    'core.agent.get',
    'core.agent.invoke',

    // SQL – si hay bases de datos internas de clientes/proyectos
    'core.sql.select',
    'core.sql.query',

    // Web search (cuando Tavily MCP esté operativo)
    'mcp__mcp-tavily-web__tavily.search',
  ],
  allowedScopes: [
    'market_research',
    'opportunity_discovery',
    'offer_ideation',
    'go_to_market',
    'niche_mapping',
  ] as AgentScope[],
  temperature: 0.27,
  memory: {
    focusLines: [
      'Pymes con procesos manuales que se beneficiarían de automatización.',
      'Empresas que ya usan herramientas como Excel, Power BI, Power Automate, pero sin orquestación avanzada.',
      'Negocios con mucho manejo de documentos, PDFs, scraping o integraciones dispersas.',
      'Profesionales y microempresas que necesitan sistemas ligeros pero potentes.',
    ],
    lastHypotheses: [],
    preferredOutputs: [
      'Lista de 3–7 nichos con descripción breve.',
      'Mapa: Nicho → Problema → Solución AURA → Primer MVP.',
      'Ideas de contenido para validar interés (videos, posts, casos de uso).',
    ],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE MARKET_SCOUT
// =======================================================================

export function registerMarketScoutAgent() {
  try {
    const validated = validateAgentDefinition(MARKET_SCOUT_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[marketScout.agent] market_scout ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[marketScout.agent] Agente market_scout registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[marketScout.agent] Error registrando market_scout', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes moverlo a un índice global después)
registerMarketScoutAgent();
