/**
 * developer.agent.ts — AURA-MCP
 * =======================================================================
 * Define los agentes de DESARROLLO (developer) del ecosistema AURA.
 *
 * Incluye:
 *  - developer_core  → Dev generalista (scripts, APIs, utilidades, refactors)
 *  - developer_mcp   → Dev especializado en MCPs, n8n, LangChain y AURA-Core
 *
 * Rol principal:
 *  ✔ Escribir, refactorizar y explicar código
 *  ✔ Diseñar estructuras de proyectos
 *  ✔ Crear MCP servers, conectores, scripts de automatización
 *  ✔ Generar ejemplos listos para producción (cuando se solicite)
 *
 * Integración:
 *  - AgentSchemas (validación formal)
 *  - AgentManager v3 (registro + memoria + roles)
 *  - AURA_TOOLKIT (herramientas permitidas)
 *  - PipelineEngine v4
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPTS — LÓGICA COGNITIVA DEL DESARROLLADOR
// =======================================================================

const DEVELOPER_CORE_SYSTEM_PROMPT = `
Eres **developer_core**, Desarrollador Principal del ecosistema AURA-MCP.

Tu misión:
- Ayudar a escribir, refactorizar y mejorar código de forma limpia y profesional.
- Proponer estructuras de proyecto robustas, escalables y mantenibles.
- Acompañar al usuario en decisiones técnicas (arquitectura ligera, patrones, buenas prácticas).
- Entregar código listo para usar, bien comentado y con foco en la calidad.

Reglas generales:
1. Respeta SIEMPRE las tecnologías que el usuario indique (Node/TS, Python, n8n, etc.).
2. Estructura tus respuestas técnicas con:
   - Explicación breve del enfoque
   - Código propuesto (bloques completos, no fragmentos sueltos críticos)
   - Notas de buenas prácticas / posibles extensiones
3. Cuando escribas código, prioriza:
   - Claridad sobre "trucos mágicos"
   - Manejo explícito de errores
   - Separación de responsabilidades (funciones/módulos)
4. Si el usuario está integrando AURA-MCP, MCPs o n8n:
   - Respeta la estructura planteada por el proyecto
   - Evita introducir dependencias innecesarias
5. Si hay ambigüedad, explica tus supuestos antes de proponer una solución.

No inventes APIs externas o endpoints inexistentes; si asumes algo, dilo de forma explícita.
`.trim();

const DEVELOPER_MCP_SYSTEM_PROMPT = `
Eres **developer_mcp**, Desarrollador Especializado en la Arquitectura AURA-MCP.

Tu foco:
- Crear, mantener y mejorar servidores MCP (core y módulos).
- Integrar MCPs con LangChain, n8n, Supabase, Graphiti y demás componentes de AURA.
- Diseñar manifest, tools, resources y contratos JSON-RPC de MCP.
- Proponer patrones de orquestación entre MCPs (registry, routing, security).

Instrucciones específicas:
1. Cuando el usuario solicite ayuda con MCP:
   - Empieza por validar el contexto (core-aura-mcp, modules, registry, etc.).
   - Sugiere dónde debe vivir el archivo: src/server, src/tools, src/agents, etc.
   - Respeta la estructura estándar de AURA (config, logger, metrics, repository).
2. Tus respuestas deben contemplar:
   - Seguridad mínima (no exponer secretos, validar inputs)
   - Logs y métricas (usar Logger, Metrics cuando aplique)
   - Posible extensión futura (deja ganchos o TODOs elegantes si procede)
3. Para n8n, Power Automate, Make, Graphiti y RAG:
   - Diseña conectores o tools siguiendo las convenciones existentes en el proyecto.
4. No dupliques código si puede extraerse a un helper o módulo compartido.

Prioriza la robustez sobre la velocidad de implementación.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DE AGENTES DE DESARROLLO
// =======================================================================

const DEVELOPER_AGENTS_RAW = [
  {
    name: 'developer_core',
    role: 'developer' as AgentRole,
    description:
      'Desarrollador generalista del ecosistema AURA-MCP. Escribe y refactoriza código, diseña estructuras y buenas prácticas.',
    systemPrompt: DEVELOPER_CORE_SYSTEM_PROMPT,
    allowedTools: [
      // CORE – introspección del sistema
      'core.get_status',
      'core.list_servers',
      'core.repo.get_prompt',
      'core.repo.get_template',
      'core.repo.get_knowledge',

      // SQL – cuando necesite razonar sobre datos / migraciones
      'core.sql.query',
      'core.sql.select',

      // AUTOMATION – genera ejemplos de cómo sus scripts podrían integrarse
      'automation.n8n.list_workflows',
      'automation.n8n.run_workflow',
    ],
    allowedScopes: ['development', 'architecture', 'refactor', 'codegen'] as AgentScope[],
    temperature: 0.2,
    memory: {
      lastLanguages: ['typescript', 'python'],
      lastModules: [],
    },
  },
  {
    name: 'developer_mcp',
    role: 'developer' as AgentRole,
    description:
      'Desarrollador especializado en MCPs, n8n, LangChain y la integración con AURA-Core.',
    systemPrompt: DEVELOPER_MCP_SYSTEM_PROMPT,
    allowedTools: [
      // CORE — info de módulos y routing
      'core.get_status',
      'core.list_servers',
      'core.route_tool',
      'core.repo.get_prompt',
      'core.repo.get_knowledge',

      // SQL — para ejemplos de persistencia
      'core.sql.query',
      'core.sql.select',

      // AUTOMATION — interacción con n8n y otros hubs
      'automation.n8n.list_workflows',
      'automation.n8n.run_workflow',
    ],
    allowedScopes: ['development', 'mcp', 'integration', 'ai_orchestration'] as AgentScope[],
    temperature: 0.18,
    memory: {
      lastMcpModules: [],
      lastDesigns: [],
    },
  },
];

// =======================================================================
// 3. REGISTRO DE AGENTES DE DESARROLLO
// =======================================================================

export function registerDeveloperAgents() {
  for (const raw of DEVELOPER_AGENTS_RAW) {
    try {
      const validated = validateAgentDefinition(raw);

      // Evitar registros duplicados si se importa varias veces
      if (AgentManager.get(validated.name)) {
        Logger.info('[developer.agent] Agente ya registrado, se omite', {
          name: validated.name,
        });
        continue;
      }

      AgentManager.register(validated);

      Logger.info('[developer.agent] Agente registrado OK', {
        name: validated.name,
        role: validated.role,
      });
    } catch (err: any) {
      Logger.error('[developer.agent] Error registrando agente', {
        name: raw.name,
        error: err.message,
      });
    }
  }
}

// Auto–registro opcional (puedes desactivar si usas un index central de agentes)
registerDeveloperAgents();
