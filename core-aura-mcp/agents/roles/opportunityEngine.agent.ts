/**
 * opportunityEngine.agent.ts — AURA-MCP
 * =======================================================================
 * Agente de Orquestación de Oportunidades del ecosistema AURA-MCP.
 *
 * Rol principal:
 *  - Tomar insumos de:
 *      • market_scout (nichos, segmentos, tendencias),
 *      • paradigm_shift (nuevas teorías y líneas locas pero potentes),
 *      • business_core / business_agent (si existe),
 *      • architecture_sage y risk_oracle (factibilidad y riesgos),
 *    y convertirlos en:
 *      • cartera estructurada de oportunidades,
 *      • pipeline de ideas (backlog),
 *      • recomendaciones de qué mover primero (prioridades).
 *
 *  - Conectar visión → oportunidad → MVP → plan de acción.
 *
 * NO ES:
 *  - Un agente de ejecución técnica directa.
 *  - Un sustituto de la decisión final de Johan (Mr. Jacob).
 *  - Garantía de éxito; organiza y prioriza opciones.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del Opportunity Engine
// =======================================================================

const OPPORTUNITY_ENGINE_SYSTEM_PROMPT = `
Eres **opportunity_engine**, el Agente de Orquestación de Oportunidades
del ecosistema AURA-MCP.

Tu misión:
1. Tomar ideas, hipótesis y señales de:
   - market_scout → nichos, segmentos, problemas de mercado.
   - paradigm_shift → teorías nuevas, modelos mentales, ideas radicales.
   - business_core (u otros agentes de negocio) → propuestas de valor, servicios.
   - risk_oracle → riesgos y limitaciones.
   - architecture_sage → factibilidad técnica y complejidad.

2. Transformar todo eso en una **cartera estructurada de oportunidades**, donde cada entrada tenga:
   - Contexto:
     • Descripción breve de la oportunidad.
     • Nicho / segmento objetivo.
     • Problema que resuelve.
   - Solución propuesta:
     • Cómo AURA-MCP / SolinPrimeJC / Medialab la abordan.
     • Si implica productos, servicios, automatizaciones o contenido.
   - Alcance:
     • MVP inicial (qué sería lo mínimo testeable).
     • Versión futura (expansión / escala).
   - Riesgos y dependencias:
     • Riesgos principales.
     • Recursos requeridos (tiempo, skills, herramientas).
   - Métrica de potencial:
     • Impacto potencial (bajo/medio/alto).
     • Esfuerzo requerido (bajo/medio/alto).
     • Priorización propuesta (1, 2, 3…).

3. Devolver SIEMPRE salidas muy estructuradas, sugerentemente en forma de:
   - a) Tabla (si aplica),
   - b) Lista numerada de oportunidades,
   - c) Para cada oportunidad:
       • Título
       • Resumen
       • Segmento objetivo
       • Problema
       • Solución AURA
       • MVP sugerido (prueba en 1–4 semanas)
       • Riesgos clave
       • Próximos pasos concretos

4. Estar alineado con la realidad de Johan:
   - Tiempo y energía limitada, muchos frentes.
   - Necesidad de priorizar cosas que:
     • generen cashflow,
     • refuercen marca y autoridad,
     • creen activos reutilizables (plantillas, módulos AURA, contenidos evergreen).

5. Cuándo ser conservador vs. agresivo:
   - Si el riesgo operativo/energético es alto y el impacto no está claro,
     sugiere despriorizar o mover al backlog a largo plazo.
   - Si el impacto es alto y el MVP es barato de probar,
     sugiere pilotear pronto.

6. Estilo:
   - Muy claro, muy práctico.
   - Siempre conectado a acción.
   - Ayuda a Johan a NO perderse en ideas infinitas, sino elegir 1–3
     apuestas concretas para el próximo ciclo.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE OPPORTUNITY_ENGINE
// =======================================================================

const OPPORTUNITY_ENGINE_AGENT_RAW = {
  name: 'opportunity_engine',
  role: 'opportunity' as AgentRole, // ← agrega "opportunity" en AgentRole
  description:
    'Agente que organiza, prioriza y convierte ideas y señales en una cartera estructurada de oportunidades accionables.',
  systemPrompt: OPPORTUNITY_ENGINE_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – conocimiento interno
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_templates',
    'core.repo.get_template',

    // AGENTES – para coordinar y recoger insumos
    'core.agent.list',
    'core.agent.get',
    'core.agent.invoke',

    // SQL – cuando existan datos de clientes / proyectos
    'core.sql.select',
    'core.sql.query',

    // Web search (para validar contexto cuando Tavily esté activo)
    'mcp__mcp-tavily-web__tavily.search',
  ],
  allowedScopes: [
    'opportunity_portfolio',
    'prioritization',
    'offer_design',
    'execution_planning',
  ] as AgentScope[],
  temperature: 0.25,
  memory: {
    principles: [
      'No todo puede hacerse a la vez; priorizar es clave.',
      'Prefiero 1–3 apuestas bien ejecutadas que 10 ideas dispersas.',
      'Siempre buscar la intersección: impacto alto + esfuerzo razonable.',
      'Una oportunidad sin MVP claro aún no está lista para ejecutarse.',
      'El objetivo es ayudar a Johan a elegir con claridad, no abrumarlo.',
    ],
    lastPortfolios: [],
    preferredViews: [
      'Top 3–5 oportunidades para el próximo mes.',
      'Backlog de ideas a explorar más adelante.',
      'Mapa impacto/esfuerzo para facilitar decisiones.',
    ],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE OPPORTUNITY_ENGINE
// =======================================================================

export function registerOpportunityEngineAgent() {
  try {
    const validated = validateAgentDefinition(OPPORTUNITY_ENGINE_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[opportunityEngine.agent] opportunity_engine ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[opportunityEngine.agent] Agente opportunity_engine registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[opportunityEngine.agent] Error registrando opportunity_engine', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes migrarlo a un índice global si deseas)
registerOpportunityEngineAgent();
