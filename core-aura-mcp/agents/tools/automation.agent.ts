/**
 * automation.agent.ts — AURA-MCP
 * =======================================================================
 * Define los agentes de Automatización del ecosistema AURA.
 *
 * Incluye:
 *  - automation_core      → Automations Engineer (n8n / PA / Make / Zapier)
 *  - automation_architect → Diseñador de sistemas de automatización con IA
 *
 * Su función principal:
 *  ✔ Diseñar flujos n8n / PA / Make / Zapier / MCP
 *  ✔ Optimizar procesos empresariales
 *  ✔ Generar automatizaciones robustas, seguras y documentadas
 *  ✔ Integrar IA con pipelines de negocio
 *  ✔ Orquestar módulos MCP dentro de flujos
 *
 * Integración:
 *  - AgentSchemas (validación formal)
 *  - AgentManager v3 (registro + memoria + roles)
 *  - AURA_TOOLKIT (herramientas permitidas)
 *  - PipelineEngine v4
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPTS — LÓGICA COGNITIVA DEL AGENTE
// =======================================================================

const AUTOMATION_CORE_SYSTEM_PROMPT = `
Eres **automation_core**, Ingeniero de Automatización y Orquestación del ecosistema AURA-MCP.

Tu misión:
- Analizar procesos, optimizarlos y proponer automatizaciones robustas.
- Trabajar con n8n, Power Automate, Make.com, Zapier y módulos MCP.
- Traducir requerimientos del usuario en pipelines accionables.
- Recomendar buenas prácticas, validaciones, triggers y estructuras de flujo.
- Conectar el Core AURA con flujos externos usando herramientas autorizadas.

Reglas:
1. Cuando el usuario describa un proceso, responde con:
   - Análisis del proceso
   - Mapa de flujo (texto o pseudo-diagrama)
   - Automatización recomendada (plataforma ideal)
   - Pasos concretos para implementarla
   - Posibles mejoras o monitoreo
2. Si corresponde, sugiere cuándo usar:
   - n8n modules
   - Webhooks (Zapier/Make)
   - SharePoint/Flows de Power Automate
   - Automatizaciones internas con MCPs
3. Mantén un estándar profesional, claro y con orientación a ejecución.
`.trim();

const AUTOMATION_ARCHITECT_SYSTEM_PROMPT = `
Eres **automation_architect**, Arquitecto de Automatización de Alto Nivel en AURA-MCP.

Tu enfoque:
- Diseñar arquitecturas de automatización complejas con IA.
- Integrar múltiples fuentes (APIs, bases de datos, plataformas SaaS).
- Construir sistemas resilientes, observables y escalables.
- Definir capas: triggers → transformadores → IA → MCP → persistencia → notificaciones.

Indicaciones:
1. Produce diagramas lógicos (texto) con etapas claras.
2. Prioriza seguridad, validación y logging.
3. Integra IA en puntos críticos para:
   - Enriquecimiento de datos
   - Clasificación
   - Rutas dinámicas de decisión
4. Usa herramientas autorizadas y referencia cómo se conectan con n8n, PA, Make.
5. Su estilo debe ser el de un ingeniero senior con visión de arquitectura empresarial.
`.trim();

// =======================================================================
// 2. LISTA DE AGENTES A REGISTRAR
// =======================================================================

const AUTOMATION_AGENTS_RAW = [
  {
    name: 'automation_core',
    role: 'automation' as AgentRole,
    description:
      'Ingeniero de Automatización AURA, especialista en n8n, Power Automate, Make y Zapier.',
    systemPrompt: AUTOMATION_CORE_SYSTEM_PROMPT,
    allowedTools: [
      // CORE
      'core.get_status',
      'core.list_servers',
      'core.route_tool',
      'core.repo.get_template',
      'core.repo.get_prompt',

      // SQL (para pipelines)
      'core.sql.query',
      'core.sql.select',

      // AUTOMATION
      'automation.n8n.list_workflows',
      'automation.n8n.run_workflow',
      'automation.n8n.get_execution_status',

      'automation.make.trigger',
      'automation.make.run_module',

      'automation.power_automate.run',
      'automation.power_automate.read_sharepoint',

      'automation.zapier.trigger',
      'automation.zapier.test',
    ],
    allowedScopes: ['automation', 'workflows', 'integration', 'process_design'] as AgentScope[],
    temperature: 0.2,
    memory: {
      lastWorkflows: [],
      lastOptimizations: [],
    },
  },
  {
    name: 'automation_architect',
    role: 'automation' as AgentRole,
    description:
      'Arquitecto senior de automatización, experto en diseños complejos multicapas y orquestación IA.',
    systemPrompt: AUTOMATION_ARCHITECT_SYSTEM_PROMPT,
    allowedTools: [
      'core.repo.get_template',
      'core.repo.get_knowledge',
      'core.sql.query',
      'core.route_tool',
      'automation.n8n.list_workflows',
    ],
    allowedScopes: [
      'automation',
      'architecture',
      'integration',
      'ai_orchestration',
    ] as AgentScope[],
    temperature: 0.15,
    memory: {
      architectures: [],
      lastDiagrams: [],
    },
  },
];

// =======================================================================
// 3. REGISTRO DE AGENTES
// =======================================================================

export function registerAutomationAgents() {
  for (const raw of AUTOMATION_AGENTS_RAW) {
    try {
      const validated = validateAgentDefinition(raw);

      if (AgentManager.get(validated.name)) {
        Logger.info('[automation.agent] Agente ya cargado', {
          name: validated.name,
        });
        continue;
      }

      AgentManager.register(validated);

      Logger.info('[automation.agent] Agente registrado OK', {
        name: validated.name,
        role: validated.role,
      });
    } catch (err: any) {
      Logger.error('[automation.agent] Error registrando agente', {
        name: raw.name,
        error: err.message,
      });
    }
  }
}

// Auto–registro opcional (puedes desactivarlo si usas index de agentes)
registerAutomationAgents();
