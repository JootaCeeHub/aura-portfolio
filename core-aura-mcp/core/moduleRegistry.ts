/**
 * moduleRegistry.ts — AURA-MCP
 * ============================================================================
 * Registro central de módulos MCP+IA basados en la Plantilla MCP IA Modular.
 *
 * Cada módulo se describe mediante un McpModuleBlueprint y queda accesible
 * para:
 *   - ModuleRouter
 *   - PipelineEngine
 *   - OrchestratorCore
 *   - UIs JSON-driven
 *
 * Alineado con:
 *   - Plantilla Mcp Ia Modular.pdf
 *   - Prompt System Filtrados
 *   - Arquitectura AURA-MCP Core
 */

import fs from 'fs';
import path from 'path';

import { Logger } from '../src/lib/logger.js';
import {
  McpModuleBlueprint,
  McpModuleBlueprintSchema,
  validateMcpModuleBlueprint,
} from './mcpModularBlueprint.js';
import { EnvModeEnum, ModuleTypeEnum } from './mcpModularBlueprint.js';

// ---------------------------------------------------------------------------
// 1. Tipos internos del Registry
// ---------------------------------------------------------------------------

export type ModuleKey = string; // forma: moduleId@versionId (o @default)

export interface ModuleRecord {
  key: ModuleKey;
  moduleId: string;
  versionId: string; // semver o "default"
  contextId?: string | null; // cliente, región, etc.
  envMode: string; // local / staging / prod…
  enabled: boolean;
  tags: string[];
  blueprint: McpModuleBlueprint;
  createdAt: string;
  updatedAt: string;
}

// Filtros de consulta
export interface ModuleQuery {
  moduleId?: string;
  versionId?: string;
  contextId?: string;
  envMode?: string;
  tags?: string[];
  types?: (typeof ModuleTypeEnum._type)[];
  enabledOnly?: boolean;
}

// ---------------------------------------------------------------------------
// 2. Helpers internos
// ---------------------------------------------------------------------------

function buildModuleKey(moduleId: string, versionId?: string | null): ModuleKey {
  return `${moduleId}@${versionId || 'default'}`;
}

function nowISO() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// 3. ModuleRegistry — Singleton
// ---------------------------------------------------------------------------

class ModuleRegistryCore {
  private modules: Map<ModuleKey, ModuleRecord> = new Map();

  // -----------------------------------------------------------------------
  // Registrar / actualizar módulo (upsert)
  // -----------------------------------------------------------------------
  register(blueprint: McpModuleBlueprint): ModuleRecord {
    // Extraemos identificadores desde la plantilla
    const moduleId = blueprint.cloning?.module_id || blueprint.purpose.moduleId;

    const versionId = blueprint.cloning?.version_id || 'default';

    const contextId = blueprint.cloning?.context_id ?? null;

    const envMode = blueprint.env?.mode || EnvModeEnum.Enum.local;

    const tags = blueprint.cloning?.tags || [];

    const key = buildModuleKey(moduleId, versionId);
    const existing = this.modules.get(key);

    const record: ModuleRecord = {
      key,
      moduleId,
      versionId,
      contextId: contextId || undefined,
      envMode,
      enabled: true,
      tags,
      blueprint,
      createdAt: existing?.createdAt || nowISO(),
      updatedAt: nowISO(),
    };

    this.modules.set(key, record);

    if (existing) {
      Logger.info('[ModuleRegistry] Módulo actualizado', { key, envMode, tags });
    } else {
      Logger.info('[ModuleRegistry] Módulo registrado', { key, envMode, tags });
    }

    return record;
  }

  // -----------------------------------------------------------------------
  // Registrar a partir de un objeto ANY (con validación)
  // -----------------------------------------------------------------------
  registerRaw(data: any): ModuleRecord {
    const validated = validateMcpModuleBlueprint(data);
    return this.register(validated);
  }

  // -----------------------------------------------------------------------
  // Cargar módulo desde archivo JSON (o .mcp.json en el futuro)
  // -----------------------------------------------------------------------
  registerFromFile(filePath: string): ModuleRecord | null {
    try {
      const abs = path.resolve(filePath);
      const content = fs.readFileSync(abs, 'utf8');
      const json = JSON.parse(content);

      const validated = McpModuleBlueprintSchema.parse(json);
      const rec = this.register(validated);

      Logger.info('[ModuleRegistry] Módulo registrado desde archivo', {
        file: abs,
        key: rec.key,
      });

      return rec;
    } catch (err: any) {
      Logger.error('[ModuleRegistry] Error al registrar módulo desde archivo', {
        file: filePath,
        error: err.message,
      });
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Obtener un módulo por id + versión
  // -----------------------------------------------------------------------
  get(moduleId: string, versionId?: string | null): ModuleRecord | undefined {
    const key = buildModuleKey(moduleId, versionId);
    return this.modules.get(key);
  }

  // Versión “inteligente”: si no encuentra versión específica,
  // intenta "default".
  getSmart(moduleId: string, versionId?: string | null): ModuleRecord | undefined {
    if (versionId) {
      const exact = this.get(moduleId, versionId);
      if (exact) return exact;
    }
    return this.get(moduleId, 'default');
  }

  // -----------------------------------------------------------------------
  // Habilitar / deshabilitar módulo
  // -----------------------------------------------------------------------
  enable(moduleId: string, versionId?: string | null): void {
    const key = buildModuleKey(moduleId, versionId);
    const rec = this.modules.get(key);
    if (!rec) return;

    rec.enabled = true;
    rec.updatedAt = nowISO();
    this.modules.set(key, rec);

    Logger.info('[ModuleRegistry] Módulo habilitado', { key });
  }

  disable(moduleId: string, versionId?: string | null): void {
    const key = buildModuleKey(moduleId, versionId);
    const rec = this.modules.get(key);
    if (!rec) return;

    rec.enabled = false;
    rec.updatedAt = nowISO();
    this.modules.set(key, rec);

    Logger.warn('[ModuleRegistry] Módulo deshabilitado', { key });
  }

  // -----------------------------------------------------------------------
  // Listar módulos con filtros
  // -----------------------------------------------------------------------
  list(query: ModuleQuery = {}): ModuleRecord[] {
    const { moduleId, versionId, contextId, envMode, tags, types, enabledOnly } = query;

    let items = Array.from(this.modules.values());

    if (moduleId) {
      items = items.filter((m) => m.moduleId === moduleId);
    }
    if (versionId) {
      items = items.filter((m) => m.versionId === versionId);
    }
    if (contextId) {
      items = items.filter((m) => m.contextId === contextId);
    }
    if (envMode) {
      items = items.filter((m) => m.envMode === envMode);
    }
    if (enabledOnly) {
      items = items.filter((m) => m.enabled);
    }
    if (tags && tags.length > 0) {
      items = items.filter((m) => tags.every((t) => m.tags.includes(t)));
    }
    if (types && types.length > 0) {
      items = items.filter((m) => m.blueprint.purpose.types.some((t) => types.includes(t)));
    }

    return items;
  }

  // -----------------------------------------------------------------------
  // Búsqueda por tag / tipo / entorno (helpers comunes)
  // -----------------------------------------------------------------------
  findByTag(tag: string): ModuleRecord[] {
    return this.list({ tags: [tag] });
  }

  findByType(type: typeof ModuleTypeEnum._type): ModuleRecord[] {
    return this.list({ types: [type] });
  }

  findByEnv(envMode: string): ModuleRecord[] {
    return this.list({ envMode });
  }

  // -----------------------------------------------------------------------
  // Exportación del estado del registry (para debugging / observabilidad)
  // -----------------------------------------------------------------------
  snapshot() {
    return this.list().map(({ ...rest }) => rest);
  }
}

// ---------------------------------------------------------------------------
// 4. Singleton exportado
// ---------------------------------------------------------------------------

export const ModuleRegistry = new ModuleRegistryCore();

export default ModuleRegistry;
