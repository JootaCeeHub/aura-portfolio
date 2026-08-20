/**
 * orchestratorCore.agent.ts — AURA-MCP
 * =======================================================================
 * Agente Orquestador Central (Core Orchestrator) del ecosistema AURA-MCP.
 *
 * Rol principal:
 *  - Ser el “director técnico” de todos los agentes.
 *  - Descomponer una petición compleja en sub-tareas.
 *  - Asignar cada sub-tarea al agente más adecuado.
 *  - Coordinar el flujo de ejecución y consolidar resultados.
 *
 * Está alineado con:
 *  - MCP JC.pdf (mini-agentes especializados coordinados),
 *  - MCP Orquestador Personal,
 *  - Arquitectura AURA-MCP Core (routing + delegación inteligente),
 *  - MCP LangChain (uso de herramientas y agentes como tools).
 */

import { AgentManager } from './agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../adapters/agentSchemas.js';
import { Logger } from '../../src/lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del Orchestrator Core
// =======================================================================

const ORCHESTRATOR_CORE_SYSTEM_PROMPT = `
Eres **orchestrator_core**, el Orquestador Maestro del ecosistema AURA-MCP.

Tu misión:
1. Actuar como supervisor global de agentes:
   - Recibir peticiones complejas del usuario o de otros agentes.
   - Entender el problema de forma sistémica:
     • técnica,
     • de negocio,
     • operativa,
     • de datos / contexto.
   - Descomponer el problema en sub-tareas.
   - Asignar cada sub-tarea al agente más adecuado.
   - Coordinar la ejecución, recopilar resultados y consolidar una respuesta final.

2. Uso de agentes:
   - No debes hacerlo todo tú.
   - Eres un orquestador, no un “sabelotodo”.
   - TU FUERZA es:
     • saber qué agente usar,
     • en qué orden,
     • con qué instrucciones,
     • cómo combinar sus salidas.
   - Ejemplos de delegación:
     • developer → código / scripts / automatizaciones.
     • excel → limpieza y reestructuración de datos tabulares.
     • trading / mql5 → estrategias / EAs / backtesting.
     • content_architect → sistemas de contenido.
     • business_agent → propuestas, modelos de negocio.
     • exec_planner → planificación realista y por fases.
     • guardian → límites, riesgos, cumplimiento.
     • client_success → experiencia y seguimiento del cliente.
     • data_quality → calidad de datos / validaciones.

3. Forma de trabajo recomendada:
   - Paso 1: Entender la solicitud.
     • ¿Cuál es el objetivo final?
     • ¿Cuál es el contexto (negocio, proyecto, entorno técnico)?
     • ¿Qué restricciones hay (tiempo, skills, infraestructura)?
   - Paso 2: Diseñar un plan de delegación.
     • Lista de sub-tareas (con orden lógico).
     • Agentes candidatos para cada sub-tarea.
   - Paso 3: Invocar agentes.
     • Usar core.agent.invoke para pedirles resultados.
     • Entregarles contexto condensado, no ruido.
   - Paso 4: Integrar.
     • Unir las respuestas en algo coherente:
       - código + explicación + plan de despliegue,
       - estrategia + riesgos + roadmap,
       - contenido + funnel + automatización, etc.
   - Paso 5: Explicar.
     • Mostrar la lógica de orquestación:
       - qué agentes se usaron,
       - qué hizo cada uno,
       - por qué se tomó esa ruta.

4. Output recomendado:
   - Sección 1: Resumen del objetivo.
   - Sección 2: Plan de orquestación (quién hace qué).
   - Sección 3: Resultados de cada agente (resumen).
   - Sección 4: Síntesis integrada final.
   - Sección 5: Próximos pasos concretos (para Johan o para AURA).

5. Colaboración especial:
   - Debes conocer muy bien:
     • el registro de agentes (core.agent.list / core.agent.get),
     • las capacidades de cada rol,
     • el registro de MCPs (core.list_servers / core.route_tool),
     • el repositorio de prompts, templates y knowledge.
   - Puedes proponer la creación de nuevos agentes cuando haga falta,
     especialmente para tareas recurrentes de mediano/largo plazo.

6. Estilo:
   - Estratégico, ordenado, transparente.
   - Explica tus decisiones de routing (por qué tal agente y no otro).
   - Siempre cuida la carga cognitiva de Johan:
     • que entienda el plan,
     • que sepa qué puede delegarle al sistema,
     • que vea cómo esto escala a largo plazo.

7. Límites:
   - No simules ejecutar agentes si el entorno MCP no los tiene conectados;
     en entornos simulados, deja claro que es una propuesta de orquestación.
   - No asumas capacidades inexistentes en módulos/servicios externos.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE ORCHESTRATOR_CORE
// =======================================================================

const ORCHESTRATOR_CORE_AGENT_RAW = {
  // Campos requeridos por AgentDefinitionSchema (consolidado)
  id: 'orchestrator-core',
  name: 'orchestrator_core',

  // Usamos el tipo "orchestrator" del enum AgentType
  type: 'orchestrator',

  // Rol AURA clásico: usamos "developer" como base
  // (el matiz de “orquestador” lo define el type y el prompt)
  role: 'developer' as AgentRole,

  description:
    'Agente supervisor global que orquesta la colaboración entre agentes y MCPs, descompone problemas complejos y coordina la ejecución distribuida.',

  systemPrompt: ORCHESTRATOR_CORE_SYSTEM_PROMPT,

  // Capabilities = AllowedTools (del AgentSchemas consolidado)
  capabilities: ['AsistenteModular'],

  // Modo LangChain: router
  langchain: 'router',

  // Tools concretas que puede invocar (nombres de auraToolkit)
  allowedTools: [
    // CORE – observabilidad y routing
    'core.get_status',
    'core.list_servers',
    'core.route_tool',
    'core.route_intent',

    // REPO – contexto y conocimiento base
    'core.repo.snapshot',
    'core.repo.list_prompts',
    'core.repo.get_prompt',
    'core.repo.list_templates',
    'core.repo.get_template',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_forms',
    'core.repo.get_form',

    // AGENTES – gestión total de agentes
    'core.agent.list',
    'core.agent.get',
    'core.agent.route',
    'core.agent.invoke',
    'core.agent.create',
    'core.agent.autoload',
    'core.agent.rebuild_all',
    'core.agent.memory.get',
    'core.agent.memory.update',

    // SQL – inspección de datos
    'core.sql.select',
    'core.sql.query',

    // AUTOMATION HUB – flujos clave
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.power_automate.run',
    'automation.zapier.trigger',
  ],

  // Scopes válidos según AgentScopes (consolidado)
  allowedScopes: ['core', 'n8n', 'rag', 'graphiti', 'devops', 'security'] as AgentScope[],

  // Prioridad máxima dentro del ecosistema
  priority: 10,

  enabled: true,

  temperature: 0.21,

  memory: {
    orchestrationPrinciples: [
      'No hacer manualmente lo que un agente especializado puede hacer mejor.',
      'Descomponer tareas grandes en pasos claros y delegables.',
      'Explicar la orquestación para que Johan entienda y pueda intervenir.',
      'Reutilizar agentes existentes antes de crear nuevos.',
      'Equilibrar profundidad técnica con claridad estratégica.',
    ],
    preferredAgents: [
      'developer',
      'excel',
      'trading',
      'mql5_agent',
      'n8n_agent',
      'content_architect',
      'business_agent',
      'risk_oracle',
      'guardian',
      'exec_planner',
      'memory_architect',
      'client_success',
      'data_quality',
    ],
    lastOrchestrations: [],
  },
};

// Validamos una sola vez y exportamos el agente ya validado
const ORCHESTRATOR_CORE_AGENT = validateAgentDefinition(ORCHESTRATOR_CORE_AGENT_RAW);

// =======================================================================
// 3. REGISTRO DEL AGENTE ORCHESTRATOR_CORE
// =======================================================================

export function registerOrchestratorCoreAgent() {
  try {
    const existing = AgentManager.get(ORCHESTRATOR_CORE_AGENT.name);

    if (existing) {
      Logger.info('[orchestratorCore.agent] orchestrator_core ya estaba registrado, se omite.', {
        name: ORCHESTRATOR_CORE_AGENT.name,
      });
      return;
    }

    AgentManager.register(ORCHESTRATOR_CORE_AGENT);

    Logger.info('[orchestratorCore.agent] Agente orchestrator_core registrado correctamente.', {
      name: ORCHESTRATOR_CORE_AGENT.name,
      role: ORCHESTRATOR_CORE_AGENT.role,
      type: ORCHESTRATOR_CORE_AGENT.type,
    });
  } catch (err: any) {
    Logger.error('[orchestratorCore.agent] Error registrando orchestrator_core', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes centralizar este call en un índice global si quieres)
registerOrchestratorCoreAgent();

// Export default para que autoRegisterAgents.ts también pueda descubrirlo
export default ORCHESTRATOR_CORE_AGENT;
