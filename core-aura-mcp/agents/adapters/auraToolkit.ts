/**
 * auraToolkit.ts — AURA-MCP (Versión Consolidada)
 * -------------------------------------------------------------
 * Toolkit oficial para la provisión de tools a:
 *
 *  ✔ Agentes LangChain
 *  ✔ AURA Pipeline Engine
 *  ✔ OrchestratorCore
 *  ✔ MCP Servers y SubAgentes
 *
 * Funcionalidades:
 *  - Expone tools locales del Core
 *  - Integra tools externas (n8n, Zapier, PowerAutomate…)
 *  - Carga dinámica de tools MCP remotas
 *  - Filtrado avanzado basado en:
 *       · allowedTools (AllowedTools del agente)
 *       · allowedScopes (Access Control)
 *       · AgentType (orchestrator / security / tool-only…)
 *
 * Alineado a:
 *  - agentSchemas.ts (2025 consolidated)
 *  - MCP LangChain Integration Layer
 *  - Prompt System Filtrados
 *  - AURA-MCP Orchestration Core
 */

import { Logger } from '../../src/lib/logger.js';
import { CoreTools } from '../../src/tools/coreTools.js';
import { MCPToolLoader } from '../engine/mcpToolLoader.js';
import { AgentDefinition } from './agentSchemas.js';

// Tipo estándar de tool para LangChain
export type LC_Tool = {
  name: string;
  description: string;
  func: (input: any) => Promise<any>;
};

// Cache para MCP tools remotas
let cachedMcpTools: LC_Tool[] = [];

// ==============================================================
// 1. TOOLS LOCALES DEL CORE — disponibles para todos los agentes
// ==============================================================

function localTools(): LC_Tool[] {
  return [
    {
      name: 'core.sql.query',
      description: 'Ejecuta queries SQL con control de acceso interno.',
      func: async (args) => CoreTools.sqlQuery(args),
    },
    {
      name: 'core.repo.get_prompt',
      description: 'Obtiene un systemPrompt o archivo desde el Repo AURA.',
      func: async (args) => CoreTools.repoGetPrompt(args),
    },
    {
      name: 'core.route_tool',
      description: 'Redirige una tool a un módulo MCP remoto.',
      func: async (args) => CoreTools.routeTool(args),
    },
    {
      name: 'core.agent.get',
      description: 'Obtiene metadata y configuración de un agente AURA.',
      func: async (args) => CoreTools.agentGet(args),
    },
  ];
}

// ==============================================================
// 2. TOOLS EXTERNAS DEL ECOSISTEMA — integraciones reales
// ==============================================================

function externalTools(): LC_Tool[] {
  return [
    {
      name: 'automation.n8n.run_workflow',
      description: 'Ejecución de workflows n8n desde AURA.',
      func: async (args) => CoreTools.automationN8nRunWorkflow(args),
    },
    {
      name: 'automation.power_automate.run',
      description: 'Ejecuta Flows de Power Automate.',
      func: async (args) => CoreTools.automationPowerAutomateRun(args),
    },
    {
      name: 'automation.zapier.trigger',
      description: 'Webhook Zapier Trigger.',
      func: async (args) => CoreTools.automationZapierTrigger(args),
    },
  ];
}

// ==============================================================
// 3. CARGA DE TOOLS MCP REMOTAS DINÁMICAS (SubAgentes / Servers)
// ==============================================================

async function loadMcpTools(): Promise<LC_Tool[]> {
  try {
    const tools = await MCPToolLoader.loadAllTools();

    cachedMcpTools = tools.map((t) => ({
      name: t.name,
      description: t.description ?? 'Tool remota MCP',
      func: async (args) => await t.call(args),
    }));

    Logger.info('[AURA_TOOLKIT] Tools MCP cargadas', {
      total: cachedMcpTools.length,
    });

    return cachedMcpTools;
  } catch (err: any) {
    Logger.error('[AURA_TOOLKIT] Error al cargar tools MCP', {
      error: err.message,
    });
    return [];
  }
}

// ==============================================================
// 4. FILTRADO POR SCOPES — ACCESS CONTROL
// ==============================================================

// ...
function filterToolsByScopes(tools: LC_Tool[], agent: AgentDefinition): LC_Tool[] {
  // Cast to any to access optional extended properties
  const scopes = (agent as any).allowedScopes;
  if (!scopes || scopes.length === 0) return tools;

  return tools.filter((t) =>
    scopes.some((scope: string) => t.name.startsWith(scope) || t.name.includes(scope))
  );
}

function filterByAllowedTools(tools: LC_Tool[], agent: AgentDefinition): LC_Tool[] {
  // Map 'tools' from AgentDefinition to logic
  const allowed = agent.tools || (agent as any).allowedTools;
  if (!allowed || allowed.length === 0) return tools;

  return tools.filter((t) => allowed.includes(t.name));
}

function filterByAgentType(tools: LC_Tool[], agent: AgentDefinition): LC_Tool[] {
  const type = agent.type as string; // Allow broader types
  switch (type) {
    case 'orchestrator':
      return tools;
    case 'security':
      return tools.filter((t) => !t.name.includes('sql'));
    case 'tool': {
      const allowed = agent.tools || (agent as any).allowedTools || [];
      return tools.filter((t) => allowed.includes(t.name));
    }
    default:
      return tools;
  }
}

// ==============================================================
// 7. MÉTODO PRINCIPAL — ENRUTADOR DE TOOLS PARA AGENTES
// ==============================================================

async function getToolsForAgent(agent: AgentDefinition): Promise<LC_Tool[]> {
  let tools: LC_Tool[] = [...localTools(), ...externalTools()];

  // Agregar MCP remotas
  const mcpTools = cachedMcpTools.length ? cachedMcpTools : await loadMcpTools();
  tools = [...tools, ...mcpTools];

  // Filtrar por allowedTools específicos
  tools = filterByAllowedTools(tools, agent);

  // Filtrar por scopes
  tools = filterToolsByScopes(tools, agent);

  // Filtrar por tipo de agente
  tools = filterByAgentType(tools, agent);

  Logger.info('[AURA_TOOLKIT] Tools asignadas a agente', {
    agent: agent.name,
    total: tools.length,
  });

  return tools;
}

// ==============================================================
// 8. EXPORT DEL TOOLKIT PARA PIPELINE ENGINE + LANGCHAIN
// ==============================================================

export const AURAToolkit = {
  async getTools(agent: AgentDefinition): Promise<LC_Tool[]> {
    return await getToolsForAgent(agent);
  },
};

// Registrar toolkit global
globalThis.AURA_TOOLKIT = AURAToolkit;

Logger.info('[AURA_TOOLKIT] Toolkit inicializado correctamente.');
