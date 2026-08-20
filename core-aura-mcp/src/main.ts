/**
 * AURA-MCP-Core — main.ts
 * Orquestador Maestro del Ecosistema AURA
 * ---------------------------------------
 * Este archivo inicializa completamente el núcleo del MCP:
 *
 *  - Carga de agentes automáticos
 *  - Carga de módulos del Registry
 *  - Bootstrap de servicios externos (n8n, Graphiti, Supabase)
 *  - Registro de todas las Tools del Core
 *  - Registro de Resources
 *  - Inicio de Servidor (HTTP + STDIO + SSE)
 */

import { MCPServer } from './server/mcpServer.js';
import { CoreTools } from './tools/coreTools.js';

import { Config } from './lib/config.js';
import { Logger } from './lib/logger.js';
import { Bootstrap } from './lib/bootstrap.js'; // ← NEW
import Registry from './lib/registry.js';
import fs from 'fs';
import path from 'path';

// Types
import { RouteToolParams, RouteIntentParams } from './types/interfaces.js';

async function boot() {
  // Cargar agentes automáticos desde src/repository/prompts/agent_*.txt
  try {
    const { AutoRegisterAgents } = await import('../agents/core/autoRegisterAgents.js');
    await AutoRegisterAgents.load();
  } catch {
    // ignore
  }

  // Registrar módulos estáticos desde config/mcp-registry.json
  await Registry.load();

  // -------------------------------------------------------------
  // 2. Bootstrap de servicios externos (n8n, Graphiti, Supabase)
  // -------------------------------------------------------------
  await Bootstrap.init(); // ← NEW

  // -------------------------------------------------------------
  // 3. Inicializar Servidor MCP (HTTP + STDIO + SSE)
  // -------------------------------------------------------------
  const server = new MCPServer(Config.port);

  // -------------------------------------------------------------
  // 4. Tools del Core — OBSERVABILIDAD
  // -------------------------------------------------------------
  server.tool('core.get_status', () => CoreTools.getStatus());
  server.tool('core.list_servers', () => CoreTools.listServers());

  // -------------------------------------------------------------
  // 5. Routing Inteligente
  // -------------------------------------------------------------
  server.tool('core.route_tool', (args: RouteToolParams) => CoreTools.routeTool(args));

  server.tool('core.route_intent', (args: RouteIntentParams) => CoreTools.routeIntent(args));

  // -------------------------------------------------------------
  // 6. Repositorio (prompts, templates, forms, knowledge)
  // -------------------------------------------------------------
  server.tool('core.repo.snapshot', () => CoreTools.repoSnapshot());
  server.tool('core.repo.list_prompts', () => CoreTools.repoListPrompts());
  server.tool('core.repo.get_prompt', (args) => CoreTools.repoGetPrompt(args));

  server.tool('core.repo.list_templates', () => CoreTools.repoListTemplates());
  server.tool('core.repo.get_template', (args) => CoreTools.repoGetTemplate(args));

  server.tool('core.repo.list_forms', () => CoreTools.repoListForms());
  server.tool('core.repo.get_form', (args) => CoreTools.repoGetForm(args));

  server.tool('core.repo.list_knowledge', () => CoreTools.repoListKnowledge());
  server.tool('core.repo.get_knowledge', (args) => CoreTools.repoGetKnowledge(args));

  // -------------------------------------------------------------
  // 7. SQL Tools (Base de Datos)
  // -------------------------------------------------------------
  server.tool('core.sql.query', (args) => CoreTools.sqlQuery(args));
  server.tool('core.sql.select', (args) => CoreTools.sqlSelect(args));
  server.tool('core.sql.write', (args) => CoreTools.sqlWrite(args));

  // -------------------------------------------------------------
  // 8. IA DISTRIBUIDA – MANAGEMENT & EXECUTION
  // -------------------------------------------------------------
  server.tool('core.agent.list', () => CoreTools.agentList());
  server.tool('core.agent.get', (args) => CoreTools.agentGet(args));

  server.tool('core.agent.route', (args) => CoreTools.agentRouteByIntent(args));

  server.tool('core.agent.invoke', (args) => CoreTools.agentInvoke(args));

  server.tool('core.agent.create', (args) => CoreTools.agentCreate(args));

  server.tool('core.agent.autoload', () => CoreTools.agentAutoload());

  server.tool('core.agent.rebuild_all', () => CoreTools.agentRebuildAll());

  server.tool('core.agent.memory.get', (args) => CoreTools.agentGetMemory(args));

  server.tool('core.agent.memory.update', (args) => CoreTools.agentUpdateMemory(args));

  // -------------------------------------------------------------
  // 9. Automation Hub (n8n, Make.com, PowerAutomate, Zapier)
  // -------------------------------------------------------------
  server.tool('automation.n8n.list_workflows', () => CoreTools.automationN8nListWorkflows());

  server.tool('automation.n8n.run_workflow', (args) => CoreTools.automationN8nRunWorkflow(args));

  server.tool('automation.n8n.get_execution_status', (args) =>
    CoreTools.automationN8nGetExecutionStatus(args)
  );

  server.tool('automation.make.trigger', (args) => CoreTools.automationMakeTrigger(args));

  server.tool('automation.make.run_module', (args) => CoreTools.automationMakeRunModule(args));

  server.tool('automation.power_automate.run', (args) =>
    CoreTools.automationPowerAutomateRun(args)
  );

  server.tool('automation.power_automate.read_sharepoint', (args) =>
    CoreTools.automationPowerAutomateReadSharePoint(args)
  );

  server.tool('automation.zapier.trigger', (args) => CoreTools.automationZapierTrigger(args));

  server.tool('automation.zapier.test', (args) => CoreTools.automationZapierTest(args));

  // -------------------------------------------------------------
  // 10. Resources (metadata del Core)
  // -------------------------------------------------------------
  server.resource('core.registry', () => ({
    modules: Registry.list(),
  }));

  // -------------------------------------------------------------
  // 11. Iniciar servidor MCP
  // -------------------------------------------------------------
  await server.start();

  // Escribir configuración para la UI
  try {
    const uiConfigPath = path.resolve('ui/public/server-config.json');
    // Asegurar que el directorio existe (aunque lo creamos manualmente, es bueno ser defensivo)
    const uiConfigDir = path.dirname(uiConfigPath);
    if (!fs.existsSync(uiConfigDir)) {
      fs.mkdirSync(uiConfigDir, { recursive: true });
    }

    fs.writeFileSync(
      uiConfigPath,
      JSON.stringify(
        {
          url: `http://localhost:${server.port}`,
        },
        null,
        2
      )
    );
    Logger.info(`Configuración de UI escrita en ${uiConfigPath}`);
  } catch (err) {
    Logger.error('Error escribiendo configuración de UI', { error: err });
  }

  Logger.info(`\x1b[32mAURA-MCP-Core arrancó correctamente en puerto ${server.port}\x1b[0m`);
  Logger.info(`\x1b[32mInterfaz disponible en http://localhost:5678\x1b[0m`);
}

boot().catch((err) => {
  console.error('\x1b[31mBoot error:\x1b[0m', err);
  process.exit(1);
});
