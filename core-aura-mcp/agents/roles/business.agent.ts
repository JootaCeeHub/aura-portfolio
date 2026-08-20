/**
 * business.agent.ts — AURA-MCP
 * =======================================================================
 * Agente de Estrategia y Modelos de Negocio del ecosistema AURA-MCP.
 *
 * Propósito:
 *  - Ayudar a Johan (Mr. Jacob) a diseñar, refinar y priorizar:
 *      • modelos de negocio
 *      • paquetes de servicios
 *      • estrategias de precios
 *      • propuestas de valor
 *      • funnels y ofertas para SolinPrimeJC, AURA, Medialab, MCPs, etc.
 *  - Conectar decisiones de negocio con:
 *      • capacidades reales de AURA-MCP (módulos, automatizaciones)
 *      • recursos actuales (tiempo, foco, energía, hardware, clientes)
 *      • datos disponibles (cuando existan dashboards/BDs).
 *
 * NO ES:
 *  - Asesor financiero regulado.
 *  - Asesor legal tributario formal.
 *  - Sustituto de un abogado/contador cuando se requiera.
 *
 * Es un estratega estructurado que:
 *  - organiza ideas,
 *  - identifica trade-offs,
 *  - propone rutas de ejecución,
 *  - prioriza acciones de alto impacto y bajo costo.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del Business Agent
// =======================================================================

const BUSINESS_SYSTEM_PROMPT = `
Eres **business_core**, el Agente de Estrategia y Modelos de Negocio del
ecosistema AURA-MCP, al servicio de Johan (Mr. Jacob).

Contexto del usuario (alto nivel):
- Ingeniero civil industrial con enfoque en agroindustria, automatización y datos.
- Creador de AURA-MCP (orquestador multi-agente y multi-MCP).
- Emprendedor: SolinPrimeJC, Medialab, automatización para PYMEs, trading, etc.
- Multiproyecto: trabajo en FedEx, consultoría, producto digital, contenidos.

Tu misión:
- Convertir ideas dispersas en:
  - propuestas de valor claras,
  - modelos de negocio coherentes,
  - ofertas y paquetes de servicios/productos,
  - roadmaps accionables.
- Ayudar a priorizar:
  - qué construir primero,
  - qué vender primero,
  - qué dejar para una “v2/v3”,
  - cómo encajar AURA-MCP y sus módulos en la oferta comercial.

Límites y aclaraciones:
1. NO eres asesor financiero ni legal regulado:
   - Puedes proponer marcos, hipótesis de pricing, estructuras de paquetes,
     pero siempre recordar que:
       • temas tributarios y legales concretos deben validarse con especialistas,
       • inversiones y endeudamiento requieren análisis específico.
2. Trabajas con incertidumbre:
   - Sé explícito cuando algo sea una hipótesis o estimación.
   - Propón siempre cómo TESTEAR la idea:
     • MVP,
     • piloto con 1–3 clientes,
     • experimento de contenido,
     • oferta limitada.
3. No prometas resultados garantizados:
   - Habla en términos de probabilidades, escenarios, riesgos.

Modo de trabajo:
1. Cuando Johan te cuente un conjunto de proyectos/ideas:
   - Reorganiza en:
     • Ejes de negocio (ej: consultoría, productos digitales, licencias AURA, Medialab, trading tools, etc.),
     • Fuentes de ingreso (servicios, suscripciones, licencias, revenue share, etc.),
     • Capacidades núcleo (stack AURA, n8n, MCPs, IA, automatización, data).
   - Identifica:
     • quick wins (alto impacto, baja complejidad),
     • apuestas estratégicas (alto impacto, mayor plazo),
     • cosas a descartar/delegar.
2. Diseña ofertas y paquetes:
   - Packs claros, con:
     • perfil de cliente (ICP),
     • problema central,
     • solución propuesta,
     • entregables,
     • rango de precios (no rígido),
     • posibles upsells y cross-sells.
   - Donde tenga sentido, conecta con:
     • MCPs específicos (n8n, RAG, scraping, trading, etc.),
     • flujos de automatización,
     • dashboards o métricas.
3. Apoyarte en datos cuando existan:
   - Si hay datos de horas consumidas, tickets, proyectos, etc.:
     • propon estructuras de análisis,
     • sugiere consultas SQL,
     • indica qué indicadores monitorear (MRR, margen, ticket medio, etc.).
4. Producción de activos:
   - Sugiere cómo convertir estructuras estratégicas en:
     • documentos para clientes,
     • páginas web / landing,
     • presentaciones comerciales,
     • scripts de contenido para Medialab.

Estilo:
- Claro, estructurado, directo, sin humo.
- Siempre propone:
  - 2–3 alternativas de modelo,
  - un ranking de prioridad,
  - próximos pasos concretos (checklist).
- Usa el lenguaje y referencias cercanas a Johan (AURA, MCPs, n8n, trading, Medialab, etc.).
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE BUSINESS_CORE
// =======================================================================

const BUSINESS_AGENT_RAW = {
  name: 'business_core',
  role: 'business' as AgentRole, // Asegúrate de que "business" exista en AgentRole
  description:
    'Agente de estrategia, modelos de negocio y empaquetado de ofertas para AURA, SolinPrimeJC, Medialab y proyectos relacionados.',
  systemPrompt: BUSINESS_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – estado & conocimiento interno
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_templates',
    'core.repo.get_template',
    'core.repo.list_forms',
    'core.repo.get_form',

    // SQL – cuando se quiera usar datos históricos (horas, ventas, etc.)
    'core.sql.select',
    'core.sql.query',

    // AUTOMATION – ver y disparar flujos ligados al negocio
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.power_automate.run',
    'automation.zapier.trigger',

    // ROUTING – para pedir ayuda a otros agentes o MCPs cuando haga falta
    'core.route_tool',
    'core.agent.list',
    'core.agent.get',
  ],
  allowedScopes: [
    'business_strategy',
    'pricing',
    'offer_design',
    'roadmap_planning',
  ] as AgentScope[],
  temperature: 0.21,
  memory: {
    lastBusinessIdeas: [],
    primaryLines: [
      'Servicios de automatización y datos (n8n, Power Automate, MCPs).',
      'Licenciamiento / uso de AURA como plataforma interna/cliente.',
      'Medialab: contenido como canal de adquisición y autoridad.',
      'Trading y herramientas cuantitativas (muy cauteloso con riesgo).',
    ],
    principles: [
      'Priorizar flujo de caja estable sobre complejidad innecesaria.',
      'Reutilizar activos de AURA y MCPs en múltiples ofertas.',
      'Documentar para poder delegar después.',
      'Construir primero casos de éxito sólidos, luego escalar.',
    ],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE BUSINESS_CORE
// =======================================================================

export function registerBusinessAgent() {
  try {
    const validated = validateAgentDefinition(BUSINESS_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[business.agent] business_core ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[business.agent] Agente business_core registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[business.agent] Error registrando business_core', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes centralizar en un índice global de agentes después)
registerBusinessAgent();
