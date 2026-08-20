/**
 * n8nFlowBlueprint.ts — AURA-MCP
 * ================================================================================
 * Capa estándar de integración con n8n para módulos MCP+IA.
 *
 * Objetivos:
 *  - Representar en código el patrón de flujo MCP descrito en la Plantilla MCP+IA:
 *      • Webhook de entrada
 *      • Validación / Normalización
 *      • Wait node (resumeURL)
 *      • AI Agent (AURA / LLM)
 *      • Vector DB (RAG)
 *      • Respond to Webhook (UI JSON-driven)
 *
 *  - Permitir:
 *      ✔ Definir blueprints de flujos n8n de forma tipada
 *      ✔ Validar estructuras antes de desplegar
 *      ✔ Generar flujos estándar MCP de manera programática
 *
 * Alineado con:
 *  - Plantilla Mcp Ia Modular (arquitectura funcional + nodos n8n)
 */

import { z } from 'zod';
// import { Logger } from '../src/lib/logger.js';

// ============================================================================
// 1. ENUMS Y TIPOS BASE
// ============================================================================

export const N8nNodeTypeEnum = z.enum([
  'webhook',
  'wait',
  'aiAgent',
  'promptGenerator',
  'vectorDb',
  'httpRequest',
  'set',
  'function',
  'respondWebhook',
  'decision',
  'subworkflow',
  'unknown',
]);

export type N8nNodeType = z.infer<typeof N8nNodeTypeEnum>;

export const N8nEdgeTypeEnum = z.enum(['main', 'error', 'conditional']);
export type N8nEdgeType = z.infer<typeof N8nEdgeTypeEnum>;

export const N8nPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// ============================================================================
// 2. NODOS Y ARISTAS (ESCUELA N8N)
// ============================================================================

export const N8nNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'El id del nodo debe ser alfanumérico.'),
  name: z.string().min(1),
  type: N8nNodeTypeEnum,
  position: N8nPositionSchema.optional(),
  description: z.string().optional(),
  critical: z.boolean().default(false),
  tags: z.array(z.string()).default([]),

  // Configuración específica del nodo (n8n JSON)
  config: z.record(z.any()).default({}),
});

export type N8nNode = z.infer<typeof N8nNodeSchema>;

export const N8nEdgeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'El id de la arista debe ser alfanumérico.'),
  source: z.string().min(1),
  target: z.string().min(1),
  type: N8nEdgeTypeEnum.default('main'),
  condition: z.string().optional(),
});

export type N8nEdge = z.infer<typeof N8nEdgeSchema>;

// ============================================================================
// 3. BLUEPRINT COMPLETO DE FLUJO N8N
// ============================================================================

export const N8nFlowBlueprintSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'El id del flujo debe ser alfanumérico.'),
  name: z.string().min(3),
  description: z.string().min(10),

  // módulo MCP+IA asociado (opcional)
  moduleId: z.string().optional(),

  // entorno (dev/staging/prod, etc.)
  envMode: z.string().default('local'),

  // nodos y enlaces
  nodes: z.array(N8nNodeSchema),
  edges: z.array(N8nEdgeSchema),

  // metadata extra (para router, UI, etc.)
  metadata: z
    .object({
      tags: z.array(z.string()).default([]),
      version: z.string().default('v1'),
      resumeUrlEnabled: z.boolean().default(true),
      // nombre del nodo que expone la resume_url (normalmente el Wait)
      resumeNodeId: z.string().optional(),
      // canal asociado (web, mobile, api, discord…)
      channels: z.array(z.string()).default([]),
    })
    .default({
      tags: [],
      version: 'v1',
      resumeUrlEnabled: true,
      channels: [],
    }),
});

export type N8nFlowBlueprint = z.infer<typeof N8nFlowBlueprintSchema>;

// ============================================================================
// 4. FACTORY — FLUJO MCP ESTÁNDAR
// ============================================================================

/**
 * Crea un flujo estándar MCP+IA:
 *
 *   Webhook → (Set/Function) → Wait → AI Agent → Vector DB → Respond to Webhook
 *
 * Patrón recomendado en la plantilla:
 *   - Webhook recibe evento JSON.
 *   - Nodo de normalización/validación.
 *   - Nodo Wait expone resume_url.
 *   - AI Agent consulta contexto + RAG.
 *   - Vector DB consulta embeddings y aporta evidencias.
 *   - Respond to Webhook devuelve UI JSON-driven al cliente.
 */
export function createStandardMcpFlowBlueprint(params: {
  id: string;
  name: string;
  description: string;
  moduleId?: string;
  basePath?: string; // ruta HTTP para el webhook (ej: /api/mcp/onboarding)
  envMode?: string;
}): N8nFlowBlueprint {
  const {
    id,
    name,
    description,
    moduleId,
    basePath = '/webhook/mcp/default',
    envMode = 'local',
  } = params;

  const nodes: N8nNode[] = [
    {
      id: 'webhook_in',
      name: 'Entrada Webhook',
      type: 'webhook',
      description: 'Recibe el evento HTTP entrante para el módulo MCP.',
      critical: true,
      config: {
        path: basePath,
        method: 'POST',
        responseMode: 'onReceived',
      },
      tags: [],
    },
    {
      id: 'normalize_input',
      name: 'Normalizar / Validar Input',
      type: 'function',
      description: 'Limpia y normaliza el payload para que cumpla con InputSchema estándar.',
      critical: true,
      config: {
        fn: 'normalizeInputToMcpStandard',
      },
      tags: [],
    },
    {
      id: 'wait_resume',
      name: 'Wait (resumeURL)',
      type: 'wait',
      description:
        'Pausa el flujo y expone una resume_url para reanudar desde el cliente o desde otro sistema.',
      critical: true,
      config: {
        waitType: 'webhook',
        ttlMinutes: 60,
      },
      tags: [],
    },
    {
      id: 'prompt_generator',
      name: 'Prompt Generator',
      type: 'promptGenerator',
      description: 'Construye el prompt base para el agente IA según el módulo y el contexto.',
      config: {
        moduleId,
      },
      critical: false,
      tags: [],
    },
    {
      id: 'ai_agent',
      name: 'AI Agent (AURA)',
      type: 'aiAgent',
      description: 'Agente IA que consume el prompt, contexto y RAG para producir respuesta.',
      critical: true,
      config: {
        agent: 'orchestrator_core',
        useRag: true,
      },
      tags: [],
    },
    {
      id: 'vector_db',
      name: 'Vector DB (RAG)',
      type: 'vectorDb',
      description: 'Consulta embeddings en Supabase / vector engine y devuelve evidencias.',
      config: {
        table: 'documents_embeddings',
        topK: 8,
      },
      critical: false,
      tags: [],
    },
    {
      id: 'respond_webhook',
      name: 'Responder Webhook',
      type: 'respondWebhook',
      description: 'Devuelve una UI JSON-driven al cliente (content_blocks + resume_url).',
      critical: true,
      config: {
        contentType: 'application/json',
      },
      tags: [],
    },
  ];

  const edges: N8nEdge[] = [
    {
      id: 'webhook_to_normalize',
      source: 'webhook_in',
      target: 'normalize_input',
      type: 'main',
    },
    {
      id: 'normalize_to_wait',
      source: 'normalize_input',
      target: 'wait_resume',
      type: 'main',
    },
    {
      id: 'wait_to_prompt',
      source: 'wait_resume',
      target: 'prompt_generator',
      type: 'main',
    },
    {
      id: 'prompt_to_ai',
      source: 'prompt_generator',
      target: 'ai_agent',
      type: 'main',
    },
    {
      id: 'ai_to_vector',
      source: 'ai_agent',
      target: 'vector_db',
      type: 'main',
    },
    {
      id: 'vector_to_respond',
      source: 'vector_db',
      target: 'respond_webhook',
      type: 'main',
    },
  ];

  const blueprint: N8nFlowBlueprint = {
    id,
    name,
    description,
    moduleId,
    envMode,
    nodes,
    edges,
    metadata: {
      tags: ['mcp', 'aura', 'standard_flow'],
      version: 'v1',
      resumeUrlEnabled: true,
      resumeNodeId: 'wait_resume',
      channels: ['api', 'web'],
    },
  };

  // Validación con Zod antes de devolver
  return N8nFlowBlueprintSchema.parse(blueprint);
}

// ============================================================================
// 5. VALIDACIÓN Y HELPERS
// ============================================================================

export function validateN8nFlowBlueprint(data: any): N8nFlowBlueprint {
  return N8nFlowBlueprintSchema.parse(data);
}

export const N8nFlowBlueprintFactory = {
  /**
   * Crea un blueprint vacío para ser completado manualmente.
   */
  createEmpty(id: string, name: string, description: string): N8nFlowBlueprint {
    const blueprint: N8nFlowBlueprint = {
      id,
      name,
      description,
      envMode: 'local',
      nodes: [],
      edges: [],
      metadata: {
        tags: [],
        version: 'v1',
        resumeUrlEnabled: false,
        channels: [],
      },
    };

    return N8nFlowBlueprintSchema.parse(blueprint);
  },

  /**
   * Crea un blueprint estándar MCP usando la factory superior.
   */
  createStandard(params: {
    id: string;
    name: string;
    description: string;
    moduleId?: string;
    basePath?: string;
    envMode?: string;
  }): N8nFlowBlueprint {
    return createStandardMcpFlowBlueprint(params);
  },
};

export default N8nFlowBlueprintSchema;
