/**
 * CoreTools – AURA-MCP-Core
 * -------------------------------------------------------------
 * Versión Consolidada Final
 *
 * Unifica:
 *   ✔ Observabilidad
 *   ✔ Routing directo
 *   ✔ Routing por intención
 *   ✔ Repositorio (prompts/templates/forms/knowledge)
 *   ✔ SQL Tools
 *   ✔ AgentTools (create/autoload/rebuild)
 *   ✔ AgentInvoker → integrado con AgentEngine consolidado
 *   ✔ Automation Hub (n8n, Make, PowerAutomate, Zapier)
 *
 * Totalmente consistente con la arquitectura AURA-MCP.
 */

import { Registry } from '../lib/registry.js';
import { Logger } from '../lib/logger.js';
import { metricsCollector as Metrics } from '../lib/metrics.js';
import { Sanitizer } from '../utils/sanitizer.js';

import { IntentRouter } from '../router/intentRouter.js';
import { RepositoryIndexer } from '../repository/indexer.js';
import { database as Database, AccessLevel } from '../lib/database.js';

import { N8NConnector } from '../connectors/n8n.js';
import { PowerAutomateConnector } from '../connectors/powerAutomate.js';
import { ZapierConnector } from '../connectors/zapier.js';
import { MakeConnector } from '../connectors/make.js';

const router = new IntentRouter();

// ======================================================================
// CORE TOOLS CONSOLIDADO
// ======================================================================

export const CoreTools = {
  // ============================================================
  // 1. OBSERVABILIDAD
  // ============================================================

  async getStatus() {
    Logger.info('[CoreTools] core.get_status');
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      modules: Registry.list(),
    };
  },

  async listServers() {
    Logger.info('[CoreTools] core.list_servers');
    return { servers: Registry.list() };
  },

  // ============================================================
  // 2. ROUTING (TOOLS / INTENT)
  // ============================================================

  async routeTool(args: { server: string; tool: string; args?: any }) {
    const { server, tool, args: toolArgs } = args;

    Logger.info('[CoreTools] core.route_tool', { server, tool });
    Metrics.countTool?.();

    const module = await Registry.findByName(server);
    if (!module) return { error: `Módulo no encontrado: ${server}` };

    try {
      const payload = {
        jsonrpc: '2.0',
        method: tool,
        params: toolArgs || {},
        id: Date.now(),
      };
      const res = await Registry.callModule(module, payload);
      return { result: res };
    } catch (err: any) {
      Logger.error('[CoreTools] routeTool error', { err: err.message });
      return { error: err.message };
    }
  },

  async routeIntent(args: { intent: string; tool: string; args?: any }) {
    const { intent, tool, args: toolArgs } = args;

    Logger.info('[CoreTools] core.route_intent', { intent, tool });
    Metrics.countIntent?.();

    const cleanIntent = Sanitizer.clean(intent);
    return router.route(cleanIntent, tool, toolArgs || {});
  },

  // ============================================================
  // 3. REPOSITORY (PROMPTS / TEMPLATES / FORMS / KNOWLEDGE)
  // ============================================================

  async repoSnapshot() {
    Logger.info('[CoreTools] core.repo.snapshot');
    return RepositoryIndexer.snapshot();
  },

  // --- Prompts ---
  async repoListPrompts() {
    return { prompts: RepositoryIndexer.listPrompts() };
  },

  async repoGetPrompt(args: { name: string }) {
    try {
      const content = RepositoryIndexer.loadPrompt(args.name);
      return { name: args.name, content };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // --- Templates ---
  async repoListTemplates() {
    return { templates: RepositoryIndexer.listTemplates() };
  },

  async repoGetTemplate(args: { name: string }) {
    try {
      const content = RepositoryIndexer.loadTemplate(args.name);
      return { name: args.name, content };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // --- Forms ---
  async repoListForms() {
    return { forms: RepositoryIndexer.listForms() };
  },

  async repoGetForm(args: { name: string }) {
    try {
      const content = RepositoryIndexer.loadForm(args.name);
      return { name: args.name, content };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // --- Knowledge ---
  async repoListKnowledge() {
    return { knowledge: RepositoryIndexer.listKnowledge() };
  },

  async repoGetKnowledge(args: { name: string }) {
    try {
      const content = RepositoryIndexer.loadKnowledge(args.name);
      return { name: args.name, content };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // ============================================================
  // 4. SQL TOOLS
  // ============================================================

  async sqlQuery(args: { sql: string; params?: any[]; accessLevel?: AccessLevel }) {
    try {
      const rows = await Database.query(
        args.sql,
        args.params || []
      );
      return { rows };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async sqlSelect(args: { sql: string; params?: any[] }) {
    try {
      const rows = await Database.select(args.sql, args.params || []);
      return { rows };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async sqlWrite(args: { sql: string; params?: any[] }) {
    try {
      const rows = await Database.write(args.sql, args.params || []);
      return { rows };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // ============================================================
  // 5. AGENTS (GET / CREATE / AUTOLOAD / REBUILD)
  // ============================================================

  async agentList() {
    const { AgentManager } = await import('../../agents/core/agentManager.js');
    return { agents: AgentManager.list() };
  },

  async agentGet(args: { name: string }) {
    const { AgentManager } = await import('../../agents/core/agentManager.js');
    const agent = AgentManager.get(args.name);
    return agent ? { agent } : { error: `Agente no encontrado: ${args.name}` };
  },

  async agentRouteByIntent(args: { intent: string }) {
    const clean = Sanitizer.clean(args.intent);
    const { AgentManager } = await import('../../agents/core/agentManager.js');
    const agent = AgentManager.routeByIntent(clean);
    return agent ? { agent } : { error: 'No se encontró agente apropiado.' };
  },

  async agentUpdateMemory(args: { name: string; data: Record<string, any> }) {
    try {
      const { AgentManager } = await import('../../agents/core/agentManager.js');
      AgentManager.updateMemory(args.name, args.data);
      return { ok: true };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async agentGetMemory(args: { name: string }) {
    try {
      const { AgentManager } = await import('../../agents/core/agentManager.js');
      return { name: args.name, memory: AgentManager.getMemory(args.name) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async agentCreate(args: {
    name: string;
    role: string;
    tools?: string[];
    description?: string;
    systemPrompt?: string;
  }) {
    try {
      const { AgentGenerator } = await import('../../agents/engine/agentEngine.js');
      const res = await AgentGenerator.createAgent(args);
      return { created: true, agent: res };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async agentAutoload() {
    try {
      const { AutoRegisterAgents } = await import('../../agents/core/autoRegisterAgents.js');
      AutoRegisterAgents.load();
      return { ok: true };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async agentRebuildAll() {
    try {
      const { AutoRegisterAgents } = await import('../../agents/core/autoRegisterAgents.js');
      const { AgentManager } = await import('../../agents/core/agentManager.js');
      AgentManager.clear();
      AutoRegisterAgents.load();
      return { ok: true };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  // ============================================================
  // 6. AGENT EXECUTION (USANDO AgentEngine CONSOLIDADO)
  // ============================================================

  async agentInvoke(args: { agent: string; input: string; context?: any }) {
    const { agent, input, context = {} } = args;

    Logger.info('[CoreTools] core.agent.invoke', {
      agent,
      preview: input.slice(0, 200),
    });

    // 1. Validar agente
    const { AgentManager } = await import('../../agents/core/agentManager.js');
    const meta = AgentManager.get(agent);
    if (!meta) return { error: `Agente no registrado: ${agent}` };

    // 2. Crear ejecutor LangChain + MCP desde AgentEngine
    let executor: any;
    try {
      const { AgentFactory } = await import('../../agents/engine/agentEngine.js');
      executor = await AgentFactory.createFromPrompt(agent);
    } catch (err: any) {
      Logger.error('[CoreTools] Error creando agente', { agent, err: err.message });
      return { error: err.message };
    }

    // 3. Ejecutar agente
    try {
      const result = await executor.run(input, context);

      // 4. Actualizar memoria interna
      AgentManager.updateMemory(agent, {
        lastInput: input,
        lastOutput: result,
        lastTimestamp: Date.now(),
      });

      Logger.audit('[AGENT_INVOKE]', {
        agent,
        preview: JSON.stringify(result).slice(0, 200),
      });

      return { ok: true, agent, result };
    } catch (err: any) {
      Logger.error('[CoreTools] Error ejecutando agente', { agent, err: err.message });
      return { error: err.message };
    }
  },

  // ============================================================
  // 7. AUTOMATION HUB (n8n / Make / PowerAutomate / Zapier)
  // ============================================================

  async automationN8nListWorkflows() {
    try {
      return { workflows: await N8NConnector.listWorkflows() };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationN8nRunWorkflow(args: { workflowId: string; payload?: any }) {
    try {
      return { result: await N8NConnector.runWorkflow(args.workflowId, args.payload || {}) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationN8nGetExecutionStatus(args: { executionId: string }) {
    try {
      return { result: await N8NConnector.getExecutionStatus(args.executionId) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationMakeTrigger(args: { webhookId: string; payload?: any }) {
    try {
      return { result: await MakeConnector.triggerWebhook(args.webhookId, args.payload || {}) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationMakeRunModule(args: { moduleUrl: string; input?: any }) {
    try {
      return { result: await MakeConnector.runModule(args.moduleUrl, args.input || {}) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationPowerAutomateRun(args: { flowId: string; body?: any }) {
    try {
      return { result: await PowerAutomateConnector.triggerFlow(args.flowId, args.body || {}) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationPowerAutomateReadSharePoint(args: { site: string; list: string }) {
    try {
      return { result: await PowerAutomateConnector.readSharePointList(args.site, args.list) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationZapierTrigger(args: { webhookUrl: string; payload?: any }) {
    try {
      return { result: await ZapierConnector.triggerZap(args.webhookUrl, args.payload || {}) };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async automationZapierTest(args: { webhookUrl: string }) {
    try {
      return { result: await ZapierConnector.testZap(args.webhookUrl) };
    } catch (err: any) {
      return { error: err.message };
    }
  },
};
