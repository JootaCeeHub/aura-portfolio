/**
 * toolRegistry.ts — AURA-MCP
 * ================================================================================
 * Registro centralizado de tools MCP y herramientas internas de AURA.
 *
 * Funciones principales:
 *  ✔ Indexar todas las tools cargadas por MCPToolLoader
 *  ✔ Buscador por nombre, alias, scope y tipo
 *  ✔ Normalización hacia LC_Tool (LangChain format)
 *  ✔ Proveedor unificado para el AURAToolkit
 *  ✔ Cache inteligente y métricas
 *
 * Este módulo permite que:
 *   - LangChainExecutor obtenga tools por nombre
 *   - AURAToolkit entregue el set filtrado al agente
 *   - PipelineEngine consulte herramientas disponibles
 */

// import { z } from 'zod';
import { Logger } from '../src/lib/logger.js';
import MCPToolLoader, { MCPToolContract } from './mcpToolLoader.js';

// ============================================================================
// 1. Tipo normalizado para Tools LangChain
// ============================================================================

export interface NormalizedLCTool {
  name: string;
  description: string;
  run: (input: any) => Promise<any>;
  raw: MCPToolContract;
}

// ============================================================================
// 2. ToolRegistry Core
// ============================================================================

class ToolRegistryCore {
  private tools: Map<string, NormalizedLCTool> = new Map();
  private aliases: Map<string, string> = new Map();

  private isInitialized = false;

  // ==========================================================================
  // Inicialización: carga tools desde MCPToolLoader
  // ==========================================================================
  public async initialize() {
    if (this.isInitialized) return;

    Logger.info('[ToolRegistry] Inicializando ToolRegistry…');

    const loaded = await MCPToolLoader.loadAllTools();

    loaded.forEach((tool) => {
      const normalized = this.normalizeTool(tool);
      this.tools.set(normalized.name, normalized);

      Logger.info('[ToolRegistry] Tool registrada', { name: normalized.name });

      // Registrar alias si el tool tiene nombres secundarios
      // (soportar convención: <scope>.<name>)
      const alias1 = `mcp.${normalized.name}`;
      const alias2 = `tool.${normalized.name}`;

      this.aliases.set(alias1, normalized.name);
      this.aliases.set(alias2, normalized.name);
    });

    this.isInitialized = true;

    Logger.info('[ToolRegistry] Inicializado exitosamente', {
      total: this.tools.size,
    });
  }

  // ==========================================================================
  // Normalización de tool hacia formato LangChain (LC_Tool)
  // ==========================================================================
  private normalizeTool(tool: MCPToolContract): NormalizedLCTool {
    return {
      name: tool.name,
      description: tool.description,
      raw: tool,

      // wrapper que ejecuta el MCP Tool
      run: async (input: any) => {
        try {
          const parsedInput = tool.inputSchema.parse(input);
          const output = await tool.execute(parsedInput, {});

          // Validar el output con el outputSchema
          const validated = tool.outputSchema.parse(output);
          return validated;
        } catch (err: any) {
          Logger.error('[ToolRegistry] Error ejecutando tool', {
            tool: tool.name,
            error: err.message,
          });

          throw new Error(`Tool ${tool.name} failed: ${err.message}`);
        }
      },
    };
  }

  // ==========================================================================
  // Accesos públicos
  // ==========================================================================

  /**
   * Devuelve una tool si existe exacta.
   */
  public get(name: string): NormalizedLCTool | undefined {
    const resolved = this.aliases.get(name) || name;
    return this.tools.get(resolved);
  }

  /**
   * Busca tools cuyo nombre empiece con string.
   */
  public search(prefix: string): NormalizedLCTool[] {
    const results: NormalizedLCTool[] = [];

    for (const t of this.tools.values()) {
      if (t.name.startsWith(prefix)) {
        results.push(t);
      }
    }

    return results;
  }

  /**
   * Devuelve todas las tools como LC_Tool para LangChain.
   */
  public getAllAsLangChainTools() {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      func: async (input: any) => t.run(input),
    }));
  }

  /**
   * Devuelve todas las tools brutas MCP.
   */
  public listRaw(): MCPToolContract[] {
    return [...this.tools.values()].map((t) => t.raw);
  }

  /**
   * Recarga herramientas dinámicamente (hot reload).
   */
  public async reload() {
    Logger.warn('[ToolRegistry] Hot Reload iniciado…');

    this.tools.clear();
    this.aliases.clear();
    this.isInitialized = false;

    await this.initialize();

    Logger.warn('[ToolRegistry] Hot Reload completo');

    return true;
  }

  /**
   * Snapshot útil para diagnosticar/debuggear.
   */
  public snapshot() {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }
}

// ============================================================================
// 3. Export como Singleton
// ============================================================================

export const ToolRegistry = new ToolRegistryCore();

export default ToolRegistry;
