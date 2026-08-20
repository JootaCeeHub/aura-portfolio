/**
 * mcpToolLoader.ts — AURA-MCP
 * ================================================================================
 * Cargador dinámico de Tools MCP internas y externas.
 *
 * Funciones:
 *  ✔ Escanea /agents/tools/*.tool.ts
 *  ✔ Valida estructura MCPTool
 *  ✔ Carga dinámica (import()) con manejo de errores
 *  ✔ Registra todas las tools disponibles
 *  ✔ Integra las tools al AURAToolkit
 *
 * Alineado con:
 *   - AURA-MCP LangChain Integration
 *   - AURA Toolkit
 *   - Plantilla MCP+IA Modular (Tools Modulares)
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { z } from 'zod';
import { Logger } from '../lib/logger.js';

// ============================================================================
// 1. MCPTool Contract Validation
// ============================================================================

export const MCPToolContractSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(5),
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: z.function().args(z.any(), z.any().optional()).returns(z.any()),
});

export type MCPToolContract = z.infer<typeof MCPToolContractSchema>;

// ============================================================================
// 2. MCPToolLoader Singleton
// ============================================================================

class MCPToolLoaderCore {
  private loadedTools: MCPToolContract[] = [];
  private isLoaded: boolean = false;

  // --------------------------------------------------------------------------
  // Escanea carpeta /agents/tools/
  // --------------------------------------------------------------------------
  private getToolsDirectory(): string {
    return path.resolve(process.cwd(), 'agents/tools');
  }

  private getToolFiles(): string[] {
    const dir = this.getToolsDirectory();
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.tool.ts') || file.endsWith('.tool.js'))
      .map((file) => path.join(dir, file));
  }

  // --------------------------------------------------------------------------
  // Import dinámico y validación
  // --------------------------------------------------------------------------
  private async loadSingleTool(filePath: string): Promise<MCPToolContract | null> {
    try {
      const moduleUrl = pathToFileURL(filePath).href;
      const toolModule = await import(moduleUrl);

      // Tool debe exportar <default> con contrato MCPTool
      const tool = toolModule.default || toolModule;

      const validated = MCPToolContractSchema.parse(tool);

      Logger.info('[MCPToolLoader] Tool cargada OK', {
        name: validated.name,
        file: filePath,
      });

      return validated;
    } catch (err: any) {
      Logger.error('[MCPToolLoader] Error cargando tool', {
        file: filePath,
        error: err.message,
      });
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Carga completa
  // --------------------------------------------------------------------------
  public async loadAllTools(): Promise<MCPToolContract[]> {
    if (this.isLoaded) return this.loadedTools;

    const toolFiles = this.getToolFiles();

    Logger.info('[MCPToolLoader] Escaneando tools...', {
      total_files: toolFiles.length,
    });

    const tools: MCPToolContract[] = [];

    for (const file of toolFiles) {
      const tool = await this.loadSingleTool(file);
      if (tool) {
        tools.push(tool);
      }
    }

    this.loadedTools = tools;
    this.isLoaded = true;

    Logger.info('[MCPToolLoader] Tools cargadas correctamente', {
      total_tools: tools.length,
    });

    return tools;
  }

  // --------------------------------------------------------------------------
  // Obtener todas las tools ya cargadas
  // --------------------------------------------------------------------------
  public getTools(): MCPToolContract[] {
    return this.loadedTools;
  }

  // --------------------------------------------------------------------------
  // Hot Reload de todas las tools
  // --------------------------------------------------------------------------
  public async reloadAll(): Promise<MCPToolContract[]> {
    this.isLoaded = false;
    this.loadedTools = [];
    Logger.warn('[MCPToolLoader] Recargando todas las tools...');

    return await this.loadAllTools();
  }

  // --------------------------------------------------------------------------
  // Hot Reload de una tool específica
  // --------------------------------------------------------------------------
  public async reloadTool(toolName: string): Promise<MCPToolContract | null> {
    const file = this.getToolFiles().find((f) => f.includes(toolName));
    if (!file) {
      Logger.error('[MCPToolLoader] No existe tool para recargar', { toolName });
      return null;
    }

    Logger.warn('[MCPToolLoader] Recargando tool individual...', { toolName });

    const newTool = await this.loadSingleTool(file);
    if (!newTool) return null;

    // Reemplazar en memoria
    this.loadedTools = this.loadedTools.filter((t) => t.name !== toolName);
    this.loadedTools.push(newTool);

    return newTool;
  }
}

// ============================================================================
// 3. Export singleton
// ============================================================================

export const MCPToolLoader = new MCPToolLoaderCore();

export default MCPToolLoader;
