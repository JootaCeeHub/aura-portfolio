/**
 * moduleLoader.ts — AURA-MCP
 * ==============================================================================
 * Cargador dinámico de módulos MCP+IA basado en:
 *    ✔ entorno (local / staging / prod)
 *    ✔ cliente (contextId)
 *    ✔ canal (web, mobile, discord, api)
 *    ✔ versión (semver o default)
 *    ✔ tags, tipo, propiedades declaradas en el blueprint
 *
 * Alineado con:
 *  - Plantilla MCP IA Modular.pdf  (env, varios entornos, versionado)
 *  - AURA-MCP Registry
 */

import fs from 'fs';
import path from 'path';

import { Logger } from '../src/lib/logger.js';
import ModuleRegistry, { ModuleQuery, ModuleRecord } from './moduleRegistry.js';

import { McpModuleBlueprintSchema } from './mcpModularBlueprint.js';

export interface LoaderOptions {
  envMode?: string; // local | staging | prod
  contextId?: string; // cliente o tenant
  channel?: string; // web | mobile | discord | api
  versionId?: string; // semver
  moduleId?: string; // ID del módulo
  tags?: string[]; // filtros extra
  types?: string[]; // agent | ui | gateway | core
  enabledOnly?: boolean;
}

export interface ModuleLoadResult {
  resolved: ModuleRecord | null;
  fallback?: string;
  error?: string;
  searchQuery: LoaderOptions;
}

// ============================================================================
// 1. Load from Registry (core)
// ============================================================================

export class ModuleLoader {
  /**
   * Búsqueda con lógica de priorización basada en:
   *   1. moduleId + version + context + env
   *   2. moduleId + default version
   *   3. any version but matching context
   *   4. fallback global
   */
  static load(options: LoaderOptions): ModuleLoadResult {
    const {
      moduleId,
      versionId,
      contextId,
      channel,
      envMode = 'local',
      tags,
      types,
      enabledOnly = true,
    } = options;

    Logger.info('[ModuleLoader] Resolviendo módulo...', options);

    // 1. Query base para ModuleRegistry
    const query: ModuleQuery = {
      moduleId: moduleId || undefined,
      versionId: versionId || undefined,
      contextId: contextId || undefined,
      envMode,
      tags: tags || undefined,
      types: types as any,
      enabledOnly,
    };

    let candidates = ModuleRegistry.list(query);

    // Si vino canal, filtrar por metadata del blueprint
    if (channel) {
      candidates = candidates.filter((m) =>
        m.blueprint?.architecture?.uiResponseContract?.metadata?.channels
          ? m.blueprint.architecture.uiResponseContract.metadata.channels.includes(channel)
          : true
      );
    }

    // Caso directo: hubo coincidencias
    if (candidates.length > 0) {
      return {
        resolved: candidates[0],
        searchQuery: options,
      };
    }

    // ----------------------------------------------------------------------
    // 2. No hubo coincidencias → intentar fallback por versión
    // ----------------------------------------------------------------------
    if (moduleId) {
      const fallback = ModuleRegistry.get(moduleId, 'default');
      if (fallback) {
        return {
          resolved: fallback,
          fallback: 'default-version',
          searchQuery: options,
        };
      }
    }

    // ----------------------------------------------------------------------
    // 3. Intentar coincidencias por contexto sin versión
    // ----------------------------------------------------------------------
    if (contextId && moduleId) {
      const contextCandidates = ModuleRegistry.list({
        moduleId,
        contextId,
        enabledOnly,
      });

      if (contextCandidates.length > 0) {
        return {
          resolved: contextCandidates[0],
          fallback: 'context-no-version',
          searchQuery: options,
        };
      }
    }

    // ----------------------------------------------------------------------
    // 4. Fallback global: cualquier módulo con el mismo moduleId
    // ----------------------------------------------------------------------
    if (moduleId) {
      const globalMatch = ModuleRegistry.list({
        moduleId,
        enabledOnly,
      });

      if (globalMatch.length > 0) {
        return {
          resolved: globalMatch[0],
          fallback: 'global-any-version',
          searchQuery: options,
        };
      }
    }

    // ----------------------------------------------------------------------
    // 5. Fallback universal
    // ----------------------------------------------------------------------
    return {
      resolved: null,
      error: 'No se encontró ningún módulo compatible',
      searchQuery: options,
    };
  }

  // ============================================================================
  // 2. Load module from file
  // ============================================================================

  static loadFromFile(filePath: string): ModuleRecord | null {
    try {
      const abs = path.resolve(filePath);
      const raw = fs.readFileSync(abs, 'utf8');
      const json = JSON.parse(raw);

      // Validar blueprint
      const validated = McpModuleBlueprintSchema.parse(json);

      // Registrar módulo en runtime
      const record = ModuleRegistry.register(validated);

      Logger.info('[ModuleLoader] Módulo cargado desde archivo', { file: abs });
      return record;
    } catch (err: any) {
      Logger.error('[ModuleLoader] Error al cargar archivo', {
        error: err.message,
        file: filePath,
      });
      return null;
    }
  }

  // ============================================================================
  // 3. Load all modules from a directory
  // ============================================================================

  static loadDirectory(dir: string): number {
    const abs = path.resolve(dir);
    const files = fs.readdirSync(abs);

    let count = 0;

    for (const file of files) {
      const full = path.join(abs, file);
      if (file.endsWith('.json')) {
        const loaded = this.loadFromFile(full);
        if (loaded) count++;
      }
    }

    Logger.info('[ModuleLoader] Directorio cargado', {
      dir: abs,
      total: count,
    });

    return count;
  }

  // ============================================================================
  // 4. Hot Reload de un módulo individual
  // ============================================================================

  static hotReload(moduleId: string, versionId: string = 'default'): ModuleRecord | null {
    const record = ModuleRegistry.get(moduleId, versionId);

    if (!record) {
      Logger.warn('[ModuleLoader] No existe módulo para recargar', {
        moduleId,
        versionId,
      });
      return null;
    }

    try {
      // Re-parsear blueprint
      const revalidated = McpModuleBlueprintSchema.parse(record.blueprint);

      // Re-registrar
      const updated = ModuleRegistry.register(revalidated);

      Logger.info('[ModuleLoader] Hot reload completado', {
        moduleId,
        versionId,
      });
      return updated;
    } catch (err: any) {
      Logger.error('[ModuleLoader] Falló hot reload', {
        moduleId,
        versionId,
        error: err.message,
      });
      return null;
    }
  }
}

export default ModuleLoader;
