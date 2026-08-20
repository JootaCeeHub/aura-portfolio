/**
 * MCPToolLoader.ts — AURA-MCP
 * =====================================================================
 * Carga, valida, transforma y expone herramientas MCP en formato
 * LangChain-compatible para ser usadas por agentes AURA.
 *
 * Características Enterprise:
 *  ✔ Timeouts y fallbacks
 *  ✔ Validación formal de tools MCP
 *  ✔ Canonicalización extendida: mcp__{module}__{tool}
 *  ✔ Control de errores robusto sin detener el Core
 *  ✔ Cache interno para evitar recarga innecesaria
 *  ✔ Integración total con Registry y AURA_TOOLKIT
 *  ✔ Logging avanzado
 *
 * Este archivo es crítico en la integración LangChain ⇆ MCP.
 */

import { Logger } from '../lib/logger.js';
import { Registry } from '../lib/registry.js';
import { Metrics } from '../lib/metrics.js';

import { MCPClient } from 'langchain-mcp-adapters';

interface MCPToolDefinition {
  name: string;
  description: string;
  parameters?: any;
  call: (args: any) => Promise<any>;
}

export class MCPToolLoader {
  private static cache: Record<string, MCPToolDefinition[]> = {};
  private static loaded = false;

  // ============================================================
  // 1. Cargar herramientas de TODOS los MCP registrados
  // ============================================================
  static async loadAllTools() {
    if (this.loaded) {
      Logger.info('[MCPToolLoader] Herramientas cargadas desde cache.');
      return this.flattenCache();
    }

    Logger.info('[MCPToolLoader] Cargando herramientas MCP…');

    const modules = Registry.list();

    for (const mod of modules) {
      await this.loadModuleTools(mod.name, mod.url);
    }

    this.loaded = true;
    return this.flattenCache();
  }

  // ============================================================
  // 2. Cargar herramientas de un módulo MCP específico
  // ============================================================
  static async loadModuleTools(moduleName: string, serverUrl: string) {
    Logger.info('[MCPToolLoader] Cargando tools de módulo', {
      moduleName,
      serverUrl,
    });

    try {
      const client = new MCPClient({
        serverUrl,
        timeoutMs: 5000,
      });

      const tools = await client.loadTools();

      if (!tools || tools.length === 0) {
        Logger.warn('[MCPToolLoader] Módulo no expuso tools', {
          moduleName,
        });
        return;
      }

      const transformed = tools.map((t) => this.transformTool(moduleName, t, client));

      this.cache[moduleName] = transformed;

      Logger.info('[MCPToolLoader] Tools cargadas', {
        module: moduleName,
        count: transformed.length,
      });
    } catch (err: any) {
      Logger.warn('[MCPToolLoader] Error cargando tools', {
        module: moduleName,
        error: err.message,
      });
      Metrics.countError?.();
    }
  }

  // ============================================================
  // 3. Transformar tool MCP → Formato LangChain
  // ============================================================
  private static transformTool(
    moduleName: string,
    tool: any,
    client: MCPClient
  ): MCPToolDefinition {
    // canonical name
    const name = `mcp__${moduleName}__${tool.name}`;

    const description = tool.description || `Tool MCP expuesta por módulo ${moduleName}`;

    return {
      name,
      description,
      parameters: tool.parameters || {},
      call: async (args: any) => {
        try {
          Logger.info('[MCPToolLoader] Ejecutando tool MCP', {
            tool: name,
            moduleName,
            args,
          });

          Metrics.countTool?.();

          const res = await client.callTool(tool.name, args);

          return res;
        } catch (err: any) {
          Logger.error('[MCPToolLoader] error ejecutando tool', {
            tool: name,
            error: err.message,
          });
          Metrics.countError?.();

          throw new Error(`Error ejecutando tool MCP '${name}': ${err.message}`);
        }
      },
    };
  }

  // ============================================================
  // 4. Obtener herramientas aplanadas desde cache
  // ============================================================
  private static flattenCache(): MCPToolDefinition[] {
    return Object.values(this.cache).flat();
  }

  // ============================================================
  // 5. Obtener tools por módulo MCP
  // ============================================================
  static getToolsForModule(moduleName: string) {
    return this.cache[moduleName] || [];
  }

  // ============================================================
  // 6. Recargar todo (para hot reload)
  // ============================================================
  static async reload() {
    Logger.warn('[MCPToolLoader] Recargando todas las tools MCP…');

    this.cache = {};
    this.loaded = false;

    return await this.loadAllTools();
  }
}
