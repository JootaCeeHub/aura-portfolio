/**
 * AgentManager.ts — AURA-MCP · Cognitive Layer
 * ---------------------------------------------------------------
 * Este archivo administra:
 *
 *  ✔ Registro centralizado de agentes IA
 *  ✔ Validación estricta con agentSchemas.ts
 *  ✔ Delegación inteligente basada en intención
 *  ✔ Gestión de memoria persistente por agente
 *  ✔ Indexación por rol, scopes y capacidades
 *  ✔ Auditoría + Logging avanzado
 *
 * Es el “cerebro administrativo” del sistema cognitivo AURA.
 */

import { Logger } from '../../src/lib/logger.js';
import {
  AgentRole,
  AgentScope,
  AgentSchemas,
  validateAgentDefinition,
  AgentDefinition,
} from '../adapters/agentSchemas.js';

// =============================================================
// 1. TYPES
// =============================================================

// Usamos el tipo consolidado desde adapters/agentSchemas.ts

// =============================================================
// 2. INDICES INTERNOS (para rendimiento y búsqueda rápida)
// =============================================================

export class AgentManager {
  private static agents: Record<string, AgentDefinition> = {};

  /** Índices optimizados */
  private static byRole: Record<AgentRole, AgentDefinition[]> = {
    developer: [],
    analyst: [],
    automation: [],
    research: [],
    persona: [],
    trading: [],
    excel: [],
    power_automate: [],
    mql5: [],
    testing_qa: [],
    cost_optimizer: [],
  };

  private static byScope: Record<AgentScope, AgentDefinition[]> = ((): Record<
    AgentScope,
    AgentDefinition[]
  > => {
    const acc = {} as Record<AgentScope, AgentDefinition[]>;
    for (const s of AgentSchemas.AgentScopes) {
      acc[s] = [];
    }
    return acc;
  })();

  private static loaded = false;

  // =============================================================
  // 3. REGISTRO
  // =============================================================

  static register(agent: AgentDefinition) {
    const validated = validateAgentDefinition(agent);

    // Guardar
    this.agents[validated.name] = validated;

    // Indexar por rol
    this.byRole[validated.role].push(validated);

    // Indexar por scope
    if (validated.allowedScopes) {
      for (const scope of validated.allowedScopes) {
        if (!this.byScope[scope]) this.byScope[scope] = [];
        this.byScope[scope].push(validated);
      }
    }

    Logger.info('[AGENT] Registrado', {
      name: validated.name,
      role: validated.role,
      scopes: validated.allowedScopes,
    });
  }

  // =============================================================
  // 4. CONSULTAS
  // =============================================================

  static get(name: string): AgentDefinition | null {
    return this.agents[name] || null;
  }

  static list(): AgentDefinition[] {
    return Object.values(this.agents);
  }

  static findByRole(role: AgentRole): AgentDefinition[] {
    return this.byRole[role] || [];
  }

  static findByScope(scope: AgentScope): AgentDefinition[] {
    return this.byScope[scope] || [];
  }

  // =============================================================
  // 5. INTENT ROUTING (Delegación Cognitiva)
  // =============================================================

  static routeByIntent(intent: string): AgentDefinition | null {
    const t = intent.toLowerCase();

    const rules: Record<string, AgentRole> = {
      codigo: 'developer',
      script: 'developer',
      funcion: 'developer',

      analisis: 'analyst',
      dataset: 'analyst',
      estadistica: 'analyst',

      automatiza: 'automation',
      workflow: 'automation',
      n8n: 'automation',
      make: 'automation',

      excel: 'excel',
      spreadsheet: 'excel',

      trading: 'trading',
      metatrader: 'trading',

      'power automate': 'power_automate',
      sharepoint: 'power_automate',

      investiga: 'research',
      buscar: 'research',
      web: 'research',
    };

    for (const key in rules) {
      if (t.includes(key)) {
        return this.findByRole(rules[key])[0] || null;
      }
    }

    // fallback → persona / asistente general
    return this.findByRole('persona')[0] || null;
  }

  // =============================================================
  // 6. MEMORY HANDLING (Persistencia Cognitiva)
  // =============================================================

  static updateMemory(agentName: string, data: Record<string, any>) {
    const agent = this.get(agentName);
    if (!agent) throw new Error(`Agente no encontrado: ${agentName}`);

    agent.memory = {
      ...(agent.memory || {}),
      ...data,
    };

    Logger.audit('[AGENT_MEMORY_UPDATE]', {
      agent: agentName,
      update: data,
    });
  }

  static getMemory(agentName: string) {
    const agent = this.get(agentName);
    return agent?.memory || null;
  }

  // =============================================================
  // 7. GESTIÓN
  // =============================================================

  static clear() {
    this.agents = {};
    for (const r in this.byRole) this.byRole[r as AgentRole] = [];
    for (const s in this.byScope) this.byScope[s as AgentScope] = [];
    Logger.warn('[AGENT] Registro limpiado.');
  }

  static count() {
    return Object.keys(this.agents).length;
  }

  static status() {
    return {
      total: this.count(),
      byRole: Object.fromEntries(Object.entries(this.byRole).map(([k, v]) => [k, v.length])),
      byScope: Object.fromEntries(Object.entries(this.byScope).map(([k, v]) => [k, v.length])),
    };
  }
}
