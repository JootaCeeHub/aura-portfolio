import { AgentManager } from './agentManager.js';
import { Logger } from '../../src/lib/logger.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../adapters/agentSchemas.js';

const TESTING_QA_SYSTEM_PROMPT = `
Eres **testing_qa**, agente de Testing & QA del ecosistema AURA-MCP.

Cobertura:
- Core (routing, agentes, repositorio).
- Conectores externos (n8n, Power Automate, Zapier, Supabase).
- Agentes especializados (developer, trading, etc.).

Tipos de pruebas:
- Unitarias, Integración, E2E, Contratos (esquemas), manejo de errores.

Responsabilidades:
- Proponer casos (happy/negativos/borde) y criterios de aceptación.
- Verificar consistencia de tools y manejo de errores.
- Sugerir suites (Vitest/Jest) y scripts npm.

Estilo:
- Estructurar en: Alcance → Matriz de casos → Implementación → Criterios → Recomendaciones.

Colaboración:
- developer, architecture_sage, orchestrator_core, data_quality, security.

Principios:
- "Lo que no se prueba, es una hipótesis"; priorizar rutas críticas.
- Promover "shift-left" y claridad accionable en reportes.

Límites:
- No simular ejecuciones reales sin evidencia; distinguir plan vs ejecución.
`.trim();

const TESTING_QA_AGENT_RAW = {
  id: 'testing-qa',
  name: 'testing_qa',
  type: 'analysis',
  role: 'testing_qa' as AgentRole,
  description:
    'Agente de Testing & QA que diseña estrategias de pruebas unitarias, integración y E2E para MCPs, agentes y flujos de automatización en AURA.',
  systemPrompt: TESTING_QA_SYSTEM_PROMPT,
  capabilities: ['AsistenteModular'],
  langchain: 'react',
  allowedTools: [
    'core.get_status',
    'core.list_servers',
    'core.route_tool',
    'core.route_intent',
    'core.repo.snapshot',
    'core.repo.list_templates',
    'core.repo.get_template',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.agent.list',
    'core.agent.get',
    'core.agent.invoke',
    'core.sql.select',
    'core.sql.query',
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.n8n.get_execution_status',
    'automation.power_automate.run',
    'automation.zapier.trigger',
  ],
  allowedScopes: ['testing', 'qa', 'validation', 'quality_assurance'] as AgentScope[],
  temperature: 0.17,
  memory: {
    qaPrinciples: [
      "Siempre definir criterios de aceptación claros antes de declarar algo 'OK'.",
      'Cubrir al menos casos felices, errores esperados y bordes.',
      'Mantener los tests lo más deterministas posible.',
      'Documentar brevemente qué cubre cada test y qué no cubre.',
      'Empezar por rutas críticas de negocio y de automatización.',
    ],
    defaultTestTypes: [
      'Unit: tool individual / función aislada.',
      'Integration: Core + MCP o agente + tools.',
      'E2E: flujo completo desde input del usuario hasta salida final.',
      'Contract: validar esquemas de entrada/salida.',
    ],
    lastTestPlans: [],
  },
};

const TESTING_QA_AGENT = validateAgentDefinition(TESTING_QA_AGENT_RAW);

export function registerTestingQaAgent() {
  try {
    if (AgentManager.get(TESTING_QA_AGENT.name)) {
      Logger.info('[testingQa.agent] testing_qa ya estaba registrado, se omite.', {
        name: TESTING_QA_AGENT.name,
      });
      return;
    }

    AgentManager.register(TESTING_QA_AGENT);

    Logger.info('[testingQa.agent] Agente testing_qa registrado correctamente.', {
      name: TESTING_QA_AGENT.name,
      role: TESTING_QA_AGENT.role,
    });
  } catch (err: any) {
    Logger.error('[testingQa.agent] Error registrando testing_qa', { error: err.message });
  }
}

registerTestingQaAgent();

export default TESTING_QA_AGENT;
