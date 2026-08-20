/**
 * n8n.agent.ts — AURA-MCP
 * =======================================================================
 * Agente experto en automatización avanzada con n8n, generación de flujos,
 * auditoría, optimización, estructura JSON, módulos, webhooks,
 * integrations con APIs externas y diseño de pipelines.
 *
 * Forma parte del ecosistema cognitivo distribuido de AURA.
 *
 * Se integra con:
 *  - Automation Hub (CoreTools)
 *  - Conectores n8n (N8NConnector)
 *  - Repositorio (templates + prompts)
 *  - MCP para mcp-n8n-workflows
 *
 * Este agente es capaz de:
 *  ✔ Diseñar flujos avanzados de n8n
 *  ✔ Optimizar flujos existentes
 *  ✔ Generar plantillas JSON automáticas
 *  ✔ Crear diagramas lógicos tipo BPMN
 *  ✔ Recomendar nodos adecuados
 *  ✔ Crear módulos reutilizables
 *  ✔ Documentar flujos con estándares AURA
 */

import { AgentManager } from './agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../adapters/agentSchemas.js';
import { Logger } from '../../src/lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — El cerebro del agente n8n
// =======================================================================

const N8N_SYSTEM_PROMPT = `
Eres **n8n_core**, el Agente Maestro de Automatización del ecosistema AURA-MCP.

Tu especialidad es n8n:

┌─────────────────────────────┐
│   RESPONSABILIDADES CLAVE   │
└─────────────────────────────┘
1. Diseñar flujos n8n completos desde cero.
2. Optimizar flujos existentes (performance, mantenibilidad, modularidad).
3. Generar JSON nativo de n8n para importar directamente.
4. Definir estructuras reutilizables: sub-workflows, macros, plantillas.
5. Convertir procesos empresariales en pipelines automatizables.
6. Integrar APIs y servicios externos (HTTP Request, MySQL, Webhooks).
7. Coordinar automatizaciones entre n8n, Make.com y PowerAutomate.
8. Documentar flujos de acuerdo al estándar AURA:
   - Descripción general
   - Entradas/Salidas
   - Diagrama lógico textual
   - Justificación de diseño
   - Riesgos y fallback
   - Observabilidad recomendada

┌─────────────────────────────┐
│        REGLAS IA AURA       │
└─────────────────────────────┘
- Todos los flujos deben ser replicables.
- Cuando generes un flujo JSON, respeta estrictamente la estructura de n8n.
- No inventes URLs ni rutas internas (usar placeholders cuando corresponda).
- Siempre propone un fallback en caso de error de nodo.
- Cuando se describa un proceso empresarial, tradúcelo primero a pseudocódigo.
- Cuando analices un flujo existente, retorna:
  ✔ puntos débiles
  ✔ mejoras
  ✔ modularización
  ✔ nuevos nodos recomendados
  ✔ manejo de errores
  ✔ logging y observabilidad sugerida

Eres el ingeniero de automatización oficial del ecosistema AURA.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE N8N
// =======================================================================

const N8N_AGENT_RAW = {
  name: 'n8n_core',
  role: 'automation' as AgentRole,
  description:
    'Agente especializado en diseño, optimización y generación de workflows n8n dentro del ecosistema AURA.',
  systemPrompt: N8N_SYSTEM_PROMPT,
  allowedTools: [
    // Core
    'core.get_status',
    'core.list_servers',

    // Repo (templates para n8n)
    'core.repo.get_prompt',
    'core.repo.get_template',

    // n8n MCP module (mcp-n8n-workflows)
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.n8n.get_execution_status',

    // Make y PowerAutomate (como referencia o integración cruzada)
    'automation.make.trigger',
    'automation.power_automate.run',
  ],
  allowedScopes: [
    'automation',
    'workflow_design',
    'etl',
    'api_integration',
    'error_handling',
  ] as AgentScope[],
  temperature: 0.2,
  memory: {
    lastGeneratedFlows: [],
    lastOptimizations: [],
    preferredPatterns: ['ETL', 'Webhook-Handler', 'Retry-Logic', 'Queue-Pattern'],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE
// =======================================================================

export function registerN8NAgent() {
  try {
    const validated = validateAgentDefinition(N8N_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[n8n.agent] Ya registrado, se omite.');
      return;
    }

    AgentManager.register(validated);

    Logger.info('[n8n.agent] Agente n8n_core registrado correctamente.', {
      name: validated.name,
    });
  } catch (err: any) {
    Logger.error('[n8n.agent] Error registrando agente', {
      error: err.message,
    });
  }
}

registerN8NAgent();
