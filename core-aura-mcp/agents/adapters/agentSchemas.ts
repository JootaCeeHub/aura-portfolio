/**
 * agentSchemas.ts — AURA-MCP (Versión Consolidada Final)
 * -------------------------------------------------------------
 * Esquema unificado de roles, tipos, scopes, herramientas y agentes.
 *
 * Combina:
 *  ✔ Modelo clásico AURA (Roles / Scopes)
 *  ✔ Modelo avanzado MCP (AgentTypes / LangChain Modes / Tools)
 *  ✔ Validación estricta con Zod
 *  ✔ Estructura oficial para AgentManager y AutoRegisterAgents
 *
 * Este archivo es el "SINGLE SOURCE OF TRUTH" del ecosistema AURA.
 */

import { z } from 'zod';

// =============================================================
// 1. ROLES AURA (Roles clásicos de tu arquitectura base)
// =============================================================

export const AgentRoles = [
  'developer',
  'analyst',
  'automation',
  'research',
  'persona',
  'trading',
  'excel',
  'power_automate',
  'mql5',
  'testing_qa',
  'cost_optimizer',
] as const;

export type AgentRole = (typeof AgentRoles)[number];
export const AgentRoleSchema = z.enum(AgentRoles);

// =============================================================
// 2. SCOPES PERMITIDOS (Control de acceso del MCP)
// =============================================================

export const AgentScopes = [
  'core',
  'sql',
  'n8n',
  'graphiti',
  'rag',
  'tavily',
  'webscraping',
  'make',
  'power_automate',
  'zapier',
  'trading',
  'persona',
  'excel',
  'devops',
  'security',
  // New scopes
  'cost_optimization',
  'token_efficiency',
  'workflow_costs',
  'model_strategy',
  'testing',
  'qa',
  'validation',
  'quality_assurance',
  'algo_trading',
  'mql5_development',
  'strategy_implementation',
  'workflow_design',
  'etl',
  'api_integration',
  'error_handling',
] as const;

export type AgentScope = (typeof AgentScopes)[number];
export const AgentScopeSchema = z.enum(AgentScopes);

// =============================================================
// 3. AGENT TYPES (Clasificación MCP para coordinación)
// – cognitive / strategic / analysis / integration / optimization etc.
// =============================================================

export const AgentType = z.enum([
  'cognitive',
  'strategic',
  'analysis',
  'research',
  'integration',
  'orchestrator',
  'optimization',
  'tool',
  'security',
]);

export type AgentTypeEnum = z.infer<typeof AgentType>;

// =============================================================
// 4. LANGCHAIN EXECUTION MODE
// =============================================================

export const LangChainMode = z.enum(['react', 'plan-and-execute', 'router', 'tool-only']);

export type LangChainModeEnum = z.infer<typeof LangChainMode>;

// =============================================================
// 5. HERRAMIENTAS PERMITIDAS (tools del Módulo Maestro AURA)
// =============================================================

export const AllowedTools = z.enum([
  'AnalizarCodigo',
  'AuditorMCP',
  'ValidadorWorkflow',
  'EjecutarCodigo',
  'SubAgente',
  'DesplegarFlujo',
  'GenerarScriptMCP',
  'GenerarVisual',
  'DiseñadorInterfaz',
  'EditorVisualAI',
  'GestorArchivo',
  'BuscarDocs',
  'GenerarDocTecnica',
  'ResumenEstrategico',
  'OptimizadorProceso',
  'AsistenteModular',
]);

export type AllowedTool = z.infer<typeof AllowedTools>;

// =============================================================
// 6. DEFINICIÓN ESTRUCTURAL COMPLETA DEL AGENTE
// =============================================================

export const AgentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(64),

  // Modelo unificado
  role: AgentRoleSchema,
  type: AgentType,

  description: z.string().min(10).max(2000),

  systemPrompt: z
    .string()
    .min(50, 'El systemPrompt debe tener al menos 50 caracteres.')
    .max(20000)
    .optional(),

  version: z.string().optional().default('1.0.0'),

  // Compatibility alias
  tools: z.array(z.string()).optional(),

  temperature: z.number().min(0).max(2).optional(),

  capabilities: z.array(AllowedTools).default([]),

  langchain: LangChainMode,

  allowedScopes: z.array(AgentScopeSchema).optional(),

  allowedTools: z.array(z.string()).optional().default([]),

  mcpTools: z.array(z.string()).optional(),

  memory: z.record(z.string(), z.any()).optional(),

  priority: z.number().int().min(1).max(10).default(5),

  enabled: z.boolean().default(true),
  restricted: z.boolean().optional(),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// =============================================================
// 7. VALIDACIÓN PARA ARCHIVOS agent_*.txt
// =============================================================

export const AgentPromptHeaderSchema = z.object({
  NAME: z.string(),
  ROLE: AgentRoleSchema,
  TOOLS: z.array(z.string()).optional().default([]),
});

// =============================================================
// 8. UTILIDADES UNIFICADAS DE VALIDACIÓN
// =============================================================

export const validateAgentDefinition = (data: any) => AgentDefinitionSchema.parse(data);

export const validatePromptHeader = (fields: { NAME: string; ROLE: string; TOOLS: string[] }) =>
  AgentPromptHeaderSchema.parse(fields);

// =============================================================
// 9. EXPORTS (API OFICIAL)
// =============================================================

export const AgentSchemas = {
  AgentDefinitionSchema,
  AgentPromptHeaderSchema,
  AgentRoleSchema,
  AgentScopeSchema,
  AgentRoles,
  AgentScopes,
  AgentType,
  LangChainMode,
  AllowedTools,
  validateAgentDefinition,
  validatePromptHeader,
};

export default AgentSchemas;
