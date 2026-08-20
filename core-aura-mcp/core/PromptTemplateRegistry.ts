/**
 * PromptTemplateRegistry.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Registro y motor de plantillas de prompt para AURA-MCP.
 *
 * Funciones:
 *   ✔ Registrar plantillas (system, user, context, tool, meta)
 *   ✔ Versionado (semántico o simple)
 *   ✔ Scopes por agente, rol, dominio y etapa
 *   ✔ Render dinámico con {{variables}}
 *   ✔ Integración opcional con PromptPolicyEngine (filtrado avanzado)
 *
 * Alineado con:
 *   - Prompt System Filtrados.pdf
 *   - Plantilla MCP IA Modular.pdf
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { Logger } from '../lib/logger.js';
import { PromptPolicyEngine } from './PromptPolicyEngine.js';

// ============================================================================
// 1. Tipos
// ============================================================================

export type PromptStage = 'system' | 'instruction' | 'memory' | 'context' | 'output' | 'tool';

export interface PromptTemplateScope {
  agent?: string; // nombre de agente: "orchestrator_core"
  role?: string; // rol del agente
  domain?: string; // "diagnostico", "n8n", "trading", etc.
  stage?: PromptStage; // system / instruction / ...
}

export interface PromptTemplateDefinition extends PromptTemplateScope {
  id: string; // único global
  name: string; // nombre lógico: "diagnostico_ms_system"
  version: string; // "1.0.0" o "2025-11-22"
  description?: string;
  content: string; // el template con {{variables}}
  variables?: string[]; // nombres esperados de variables
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RenderOptions {
  applyPolicies?: boolean;
  agentRole?: string;
  baseTemperature?: number;
  debug?: boolean;
}

export interface RenderResult {
  prompt: string;
  template: PromptTemplateDefinition;
  appliedPolicies: string[];
  modifiedTemperature?: number;
}

// ============================================================================
// 2. Utilidades internas
// ============================================================================

function nowISO() {
  return new Date().toISOString();
}

/**
 * Simple template renderer:
 * Reemplaza {{var}} por el valor en data[var].
 */
function renderTemplateText(content: string, data: Record<string, any> = {}): string {
  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const value = key.split('.').reduce((acc: any, part: string) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return acc[part];
      }
      return undefined;
    }, data);

    if (value === undefined || value === null) return match;
    return String(value);
  });
}

/**
 * Comparador básico de versiones:
 * si no son semánticas, se usa comparación lexicográfica.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.');
  const pb = b.split('.');

  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] || '0', 10);
    const nb = parseInt(pb[i] || '0', 10);

    if (!isNaN(na) && !isNaN(nb)) {
      if (na > nb) return 1;
      if (na < nb) return -1;
    } else {
      if (pa[i] && !pb[i]) return 1;
      if (!pa[i] && pb[i]) return -1;
      if (pa[i] && pb[i]) {
        if (pa[i]! > pb[i]!) return 1;
        if (pa[i]! < pb[i]!) return -1;
      }
    }
  }

  return 0;
}

// ============================================================================
// 3. PromptTemplateRegistry Core
// ============================================================================

class PromptTemplateRegistryCore {
  private templatesById = new Map<string, PromptTemplateDefinition>();
  private templatesByName = new Map<string, PromptTemplateDefinition[]>();

  // ------------------------------------------------------------------------
  // REGISTRO
  // ------------------------------------------------------------------------

  register(template: PromptTemplateDefinition) {
    // Normalización mínima
    const normalized: PromptTemplateDefinition = {
      ...template,
      createdAt: template.createdAt || nowISO(),
      updatedAt: nowISO(),
    };

    this.templatesById.set(normalized.id, normalized);

    const existing = this.templatesByName.get(normalized.name) || [];
    // Reemplazar versión si ya existía
    const filtered = existing.filter((t) => t.version !== normalized.version);
    filtered.push(normalized);

    this.templatesByName.set(normalized.name, filtered);

    Logger.info('[PromptTemplateRegistry] Template registrado', {
      id: normalized.id,
      name: normalized.name,
      version: normalized.version,
    });
  }

  /**
   * Registro masivo desde un array.
   */
  registerBulk(templates: PromptTemplateDefinition[]) {
    templates.forEach((t) => this.register(t));
  }

  // ------------------------------------------------------------------------
  // RESOLUCIÓN
  // ------------------------------------------------------------------------

  /**
   * Devuelve la mejor versión para name + scope opcional.
   */
  resolve(
    nameOrId: string,
    scope?: PromptTemplateScope,
    version?: string
  ): PromptTemplateDefinition | undefined {
    // buscar por ID directo
    const byId = this.templatesById.get(nameOrId);
    if (byId) return byId;

    const list = this.templatesByName.get(nameOrId);
    if (!list || list.length === 0) return undefined;

    let candidates = [...list];

    // Filtro por scope
    if (scope) {
      candidates = candidates.filter((t) => {
        if (scope.agent && t.agent && t.agent !== scope.agent) return false;
        if (scope.role && t.role && t.role !== scope.role) return false;
        if (scope.domain && t.domain && t.domain !== scope.domain) return false;
        if (scope.stage && t.stage && t.stage !== scope.stage) return false;
        return true;
      });

      if (candidates.length === 0) {
        // No hay match específico de scope → devolvemos cualquiera
        candidates = [...list];
      }
    }

    if (version) {
      const exact = candidates.find((t) => t.version === version);
      if (exact) return exact;
    }

    // Tomar la versión más reciente
    candidates.sort((a, b) => compareVersions(a.version, b.version));
    return candidates[candidates.length - 1];
  }

  /**
   * Lista todas las plantillas, con filtro opcional por scope.
   */
  list(scope?: PromptTemplateScope): PromptTemplateDefinition[] {
    const all = [...this.templatesById.values()];

    if (!scope) return all;

    return all.filter((t) => {
      if (scope.agent && t.agent && t.agent !== scope.agent) return false;
      if (scope.role && t.role && t.role !== scope.role) return false;
      if (scope.domain && t.domain && t.domain !== scope.domain) return false;
      if (scope.stage && t.stage && t.stage !== scope.stage) return false;
      return true;
    });
  }

  // ------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------

  /**
   * Renderiza una plantilla:
   *   - Resuelve versión
   *   - Inyecta variables
   *   - Aplica políticas (opcional)
   */
  render(
    nameOrId: string,
    data: Record<string, any> = {},
    scope?: PromptTemplateScope,
    options: RenderOptions = {}
  ): RenderResult {
    const template = this.resolve(nameOrId, scope);

    if (!template) {
      throw new Error(`[PromptTemplateRegistry] Template no encontrada: ${nameOrId}`);
    }

    let rendered = renderTemplateText(template.content, data);
    let appliedPolicies: string[] = [];
    let modifiedTemperature: number | undefined = undefined;

    if (options.applyPolicies) {
      const policyResult = PromptPolicyEngine.apply(rendered, {
        agentRole: options.agentRole || template.role,
        baseTemperature: options.baseTemperature ?? 0.2,
        debug: options.debug,
      });

      rendered = policyResult.sanitizedPrompt;
      appliedPolicies = policyResult.appliedPolicies;
      modifiedTemperature = policyResult.modifiedTemperature;
    }

    return {
      prompt: rendered.trim(),
      template,
      appliedPolicies,
      modifiedTemperature,
    };
  }

  // ------------------------------------------------------------------------
  // CARGA DESDE ARCHIVOS
  // ------------------------------------------------------------------------

  /**
   * Carga templates desde un archivo YAML/JSON.
   *
   * Estructura esperada:
   *
   *  - id: "diag_ms_system_v1"
   *    name: "diagnostico_ms_system"
   *    version: "1.0.0"
   *    stage: "system"
   *    role: "business"
   *    agent: "business_core"
   *    domain: "diagnostico"
   *    content: |
   *      Eres un experto en diagnóstico...
   *    variables: ["empresa", "sector", "objetivos"]
   */
  loadFromFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`[PromptTemplateRegistry] Archivo no existe: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf8');

    let parsed: any;

    if (ext === '.yaml' || ext === '.yml') {
      parsed = YAML.parse(raw);
    } else if (ext === '.json') {
      parsed = JSON.parse(raw);
    } else {
      throw new Error(`[PromptTemplateRegistry] Formato no soportado: ${ext}`);
    }

    const items: PromptTemplateDefinition[] = Array.isArray(parsed) ? parsed : [parsed];

    this.registerBulk(items);

    Logger.info('[PromptTemplateRegistry] Templates cargadas desde archivo', {
      file: filePath,
      total: items.length,
    });
  }

  /**
   * Carga todos los templates desde un directorio, buscando .yaml/.yml/.json.
   */
  loadFromDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs
      .readdirSync(dirPath)
      .filter((f) => ['.yaml', '.yml', '.json'].includes(path.extname(f).toLowerCase()));

    for (const f of files) {
      this.loadFromFile(path.join(dirPath, f));
    }
  }

  // ------------------------------------------------------------------------
  // SNAPSHOT PARA DEBUG
  // ------------------------------------------------------------------------

  snapshot() {
    return [...this.templatesById.values()].map((t) => ({
      id: t.id,
      name: t.name,
      version: t.version,
      role: t.role,
      agent: t.agent,
      domain: t.domain,
      stage: t.stage,
    }));
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const PromptTemplateRegistry = new PromptTemplateRegistryCore();
export default PromptTemplateRegistry;
