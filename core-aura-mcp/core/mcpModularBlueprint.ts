/**
 * mcpModuleBlueprint.ts — AURA-MCP
 * ============================================================================
 * Representación en código de la "PLANTILLA MAESTRA MCP+IA (MODULAR EXTENDIDA)".
 *
 * Objetivos:
 *  - Tener un contrato tipado para diseñar módulos MCP+IA.
 *  - Permitir validar / versionar / documentar módulos desde código.
 *  - Servir como blueprint único para:
 *      · flujos n8n
 *      · agentes IA
 *      · UI JSON-driven
 *      · seguridad / despliegue / RAG
 *
 * Alineado con:
 *  - Plantilla Mcp Ia Modular.pdf (arquitectura, flujos, seguridad, entornos)
 *  - Prompt System Filtrados (políticas de entrada / salida / clasificación)
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. ENUMS Y TIPOS BÁSICOS
// ---------------------------------------------------------------------------

// Tipos de módulo según la plantilla: agente, UI, integración, núcleo, etc.
export const ModuleTypeEnum = z.enum([
  'agent',
  'ui',
  'integration',
  'core',
  'gateway',
  'monitor',
  'extractor',
  'dispatcher',
  'cognitive_interface',
]);

export type ModuleType = z.infer<typeof ModuleTypeEnum>;

// Tipos de dependencias tecnológicas
export const OrchestratorEnum = z.enum(['n8n', 'make', 'zapier', 'custom']);
export const PersistenceEnum = z.enum(['supabase', 'postgres', 'mysql', 'sqlite', 'none']);
export const IaProviderEnum = z.enum(['openai', 'anthropic', 'ollama', 'custom']);
export const FrontendStackEnum = z.enum(['vanilla', 'react', 'vue', 'nextjs', 'other']);
export const InfraEnum = z.enum(['docker', 'kubernetes', 'serverless', 'vm', 'hybrid']);
export const SecurityMechanismEnum = z.enum([
  'jwt',
  'oauth2',
  'ip_whitelist',
  'origin_check',
  'rls',
  'custom',
]);

// Entornos
export const EnvModeEnum = z.enum(['local', 'staging', 'prod']);
export type EnvMode = z.infer<typeof EnvModeEnum>;

// ---------------------------------------------------------------------------
// 2. PROPÓSITO DEL MÓDULO
// ---------------------------------------------------------------------------

export const ModulePurposeSchema = z.object({
  moduleId: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_-]+$/i, 'moduleId debe ser alfanumérico, guion o underscore.'),
  name: z.string().min(3).max(120),
  strategicPurpose: z.string().min(10, 'El propósito estratégico debe ser descriptivo.').max(4000),
  types: z.array(ModuleTypeEnum).nonempty(),
  // Alineado a la sección de “Dependencias y tecnologías clave”
  orchestrator: OrchestratorEnum.default('n8n'),
  persistence: z.array(PersistenceEnum).default(['supabase']),
  iaProviders: z.array(IaProviderEnum).default(['openai']),
  frontendStacks: z.array(FrontendStackEnum).default(['react']),
  infra: z.array(InfraEnum).default(['docker']),
  externalApis: z.array(z.string()).default([]),
  security: z.array(SecurityMechanismEnum).default(['jwt', 'rls']),
});

// ---------------------------------------------------------------------------
// 3. ARQUITECTURA FUNCIONAL (capas + n8n nodes recomendados)
// ---------------------------------------------------------------------------

export const InputSchema = z.object({
  session_id: z.string(),
  user_id: z.string(),
  payload: z.record(z.any()),
  origen: z.string(),
  contexto: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
});

export const OutputMetadataSchema = z.object({
  estado: z.string().default('finalizado'),
  origen: z.string().default('AI-AURA-Agent'),
  acciones: z.array(z.string()).default([]),
  score_confianza: z.number().min(0).max(1).optional(),
});

export const OutputSchema = z.object({
  response: z.string(),
  metadata: OutputMetadataSchema,
  next_resume_url: z.string().nullable().optional(),
});

export const ArchitectureLayerEnum = z.enum([
  'input_interface',
  'validation_flow_control',
  'cognitive_processing',
  'formatting_persistence',
  'actions_expansion',
]);

export const N8nNodeSchema = z.object({
  name: z.string(),
  type: z.string(), // ej: webhook, wait, aiAgent, function, set, httpRequest...
  purpose: z.string(),
  critical: z.boolean().default(false),
});

export const FunctionalArchitectureSchema = z.object({
  layers: z.array(
    z.object({
      id: ArchitectureLayerEnum,
      description: z.string(),
      nodes: z.array(N8nNodeSchema),
    })
  ),
  // Nodo Wait + resumeURL, clave en la plantilla
  usesResumeUrl: z.boolean().default(true),
  // JSON-driven UI response
  uiResponseContract: z
    .object({
      screen_title: z.string(),
      subtitle: z.string().optional(),
      theme: z.string().optional(),
      // content_blocks viene directamente del apartado de UI JSON-driven
      content_blocks: z.array(
        z.object({
          type: z.string(), // text, input, button, file_upload, select, etc.
          id: z.string().optional(),
          label: z.string().optional(),
          value: z.any().optional(),
          input_type: z.string().optional(),
          action: z.string().optional(),
          style: z.string().optional(),
          accept: z.array(z.string()).optional(),
        })
      ),
      resume_url: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// 4. CONFIGURACIÓN DEL AGENTE IA (LLM + tools + buenas prácticas)
// ---------------------------------------------------------------------------

export const LlModelPrefSchema = z.object({
  model: z.string(),
  provider: IaProviderEnum,
  usage: z.string(), // "critico", "general", "offline", etc.
  costProfile: z.enum(['low', 'medium', 'high']).default('medium'),
  external: z.boolean().default(true),
});

export const IaToolConfigSchema = z.object({
  name: z.string(), // supabase_agent, calendar_agent, email_agent, etc.
  description: z.string(),
  audited: z.boolean().default(true),
  logsTable: z.string().optional(), // ej: "logs_tools"
});

export const AgentConfigSchema = z.object({
  systemPromptBase: z
    .string()
    .min(30, 'El system prompt base debe describir bien el rol del agente.'),
  modelPreferences: z.array(LlModelPrefSchema).min(1),
  tools: z.array(IaToolConfigSchema).default([]),
  maxHistoryTokens: z.number().default(2048),
  multiLanguage: z.boolean().default(true),
  defaultLanguage: z.string().default('es'),
  useConfidenceScore: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// 5. SEGURIDAD, VALIDACIÓN Y AUTENTICACIÓN
// ---------------------------------------------------------------------------

export const SecurityConfigSchema = z.object({
  webhookAuth: z.object({
    headerTokenName: z.string().default('x-auth-token'),
    checkOrigin: z.boolean().default(true),
    ipWhitelistEnabled: z.boolean().default(false),
    ipWhitelist: z.array(z.string()).default([]),
  }),
  supabase: z.object({
    useRls: z.boolean().default(true),
    contextFields: z.array(z.string()).default(['user_id', 'rol', 'contexto_modulo']),
    alertsTable: z.string().default('logs_alertas'),
  }),
  resumeUrl: z.object({
    enabled: z.boolean().default(true),
    ttlMinutes: z.number().default(60),
    signed: z.boolean().default(true),
  }),
  validation: z.object({
    enableStructureValidation: z.boolean().default(true),
    enableSemanticValidation: z.boolean().default(true),
  }),
});

// ---------------------------------------------------------------------------
// 6. ENTORNOS Y VARIABLES .ENV
// ---------------------------------------------------------------------------

export const EnvVarSchema = z.object({
  key: z.string(),
  description: z.string(),
  example: z.string().optional(),
  required: z.boolean().default(true),
});

export const EnvConfigSchema = z.object({
  mode: EnvModeEnum.default('local'),
  variables: z.array(EnvVarSchema),
});

// ---------------------------------------------------------------------------
// 7. REUTILIZACIÓN, CLONACIÓN Y ESCALABILIDAD
// ---------------------------------------------------------------------------

export const CloningConfigSchema = z.object({
  module_parent_id: z.string().optional(), // módulo "madre"
  module_id: z.string().optional(), // módulo hijo / clon
  context_id: z.string().optional(), // cliente, región, entorno
  version_id: z.string().optional(), // semver: vX.Y.Z
  envFileName: z.string().default('.env'),
  tags: z.array(z.string()).default([]), // ej: ["cliente_xyz", "beta", "mx"]
});

// ---------------------------------------------------------------------------
// 8. POLÍTICAS DE PROMPT / FILTRADO (Prompt system Filtrados)
// ---------------------------------------------------------------------------

export const PromptPolicySchema = z.object({
  inputFilters: z.array(z.string()).default([]), // regex, categorías, etc.
  outputFilters: z.array(z.string()).default([]),
  classificationTags: z.array(z.string()).default([]),
  maxPromptLength: z.number().default(4000),
  allowSystemOverride: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// 9. BLUEPRINT COMPLETO DEL MÓDULO MCP+IA
// ---------------------------------------------------------------------------

export const McpModuleBlueprintSchema = z.object({
  purpose: ModulePurposeSchema,
  architecture: FunctionalArchitectureSchema,
  agentConfig: AgentConfigSchema,
  security: SecurityConfigSchema,
  env: EnvConfigSchema,
  cloning: CloningConfigSchema.optional(),
  promptPolicies: PromptPolicySchema.optional(),
  // Ejemplos de input/output estándar según la plantilla
  exampleInput: InputSchema.optional(),
  exampleOutput: OutputSchema.optional(),
  notes: z.string().optional(),
});

export type McpModuleBlueprint = z.infer<typeof McpModuleBlueprintSchema>;

// ---------------------------------------------------------------------------
// 10. HELPERS
// ---------------------------------------------------------------------------

export function validateMcpModuleBlueprint(data: any): McpModuleBlueprint {
  return McpModuleBlueprintSchema.parse(data);
}

export const McpModuleBlueprintFactory = {
  createEmpty(moduleId: string, name: string): McpModuleBlueprint {
    return McpModuleBlueprintSchema.parse({
      purpose: {
        moduleId,
        name,
        strategicPurpose: '',
        types: ['agent'],
        orchestrator: 'n8n',
        persistence: ['supabase'],
        iaProviders: ['openai'],
        frontendStacks: ['react'],
        infra: ['docker'],
        externalApis: [],
        security: ['jwt', 'rls'],
      },
      architecture: {
        layers: [],
        usesResumeUrl: true,
      },
      agentConfig: {
        systemPromptBase:
          'Eres un agente experto conectado a un módulo MCP+IA que asiste al usuario.',
        modelPreferences: [
          {
            model: 'gpt-4o',
            provider: 'openai',
            usage: 'general',
            costProfile: 'high',
            external: true,
          },
        ],
        tools: [],
        maxHistoryTokens: 2048,
        multiLanguage: true,
        defaultLanguage: 'es',
        useConfidenceScore: true,
      },
      security: {
        webhookAuth: {
          headerTokenName: 'x-auth-token',
          checkOrigin: true,
          ipWhitelistEnabled: false,
          ipWhitelist: [],
        },
        supabase: {
          useRls: true,
          contextFields: ['user_id', 'rol', 'contexto_modulo'],
          alertsTable: 'logs_alertas',
        },
        resumeUrl: {
          enabled: true,
          ttlMinutes: 60,
          signed: true,
        },
        validation: {
          enableStructureValidation: true,
          enableSemanticValidation: true,
        },
      },
      env: {
        mode: 'local',
        variables: [
          { key: 'API_BASE_URL', description: 'Dominio de n8n' },
          { key: 'JWT_SECRET', description: 'Secreto para firmar tokens' },
          { key: 'SUPABASE_URL', description: 'URL de Supabase' },
          { key: 'SUPABASE_KEY', description: 'Clave de servicio Supabase' },
        ],
      },
    });
  },
};

export default McpModuleBlueprintSchema;
