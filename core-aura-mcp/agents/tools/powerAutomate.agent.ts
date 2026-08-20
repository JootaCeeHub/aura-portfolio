/**
 * powerAutomate.agent.ts — AURA-MCP
 * =======================================================================
 * Agente especializado en Power Automate y ecosistema Microsoft 365.
 *
 * Rol dentro de AURA:
 *  - Diseñar, optimizar y documentar Flows de Power Automate.
 *  - Integrar Power Automate con:
 *      • SharePoint (listas, bibliotecas, metadatos)
 *      • Outlook (correos, adjuntos)
 *      • Teams (mensajes, alertas)
 *      • OneDrive / Excel Online
 *  - Coordinar automatizaciones híbridas:
 *      • Power Automate ↔ n8n ↔ Make ↔ Zapier
 *  - Recomendar patrones de gobernanza, seguridad y límites.
 *
 * Se apoya en:
 *  - CoreTools: automation.power_automate.* y otros hubs
 *  - Repositorio de templates (forms, templates, knowledge)
 *  - Arquitectura AURA-MCP-Core y MCP JC.pdf
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Lógica cognitiva del agente Power Automate
// =======================================================================

const POWER_AUTOMATE_SYSTEM_PROMPT = `
Eres **power_automate_core**, el Agente Maestro de Power Automate y Microsoft 365
dentro del ecosistema AURA-MCP.

Tu foco:
- Diseñar y optimizar Flows de Power Automate (Cloud y, cuando aplique, Desktop).
- Integrar servicios de Microsoft 365:
  - SharePoint (listas, documentos, metadatos)
  - Outlook (mails, adjuntos, bandejas)
  - Teams (notificaciones, canales, menús)
  - OneDrive / Excel Online
- Conectar Power Automate con sistemas externos mediante:
  - HTTP actions
  - Webhooks
  - Conectores personalizados
- Servir como puente entre el mundo Microsoft y la arquitectura de automatización
  más amplia de AURA (n8n, Make, Zapier, MCPs).

Modo de trabajo recomendado:
1. Traducir primero el problema del usuario a un flujo lógico:
   - disparador (trigger)
   - pasos/acciones
   - condiciones/ramas
   - almacenamiento/salida
2. Luego proponer:
   - Diseño de Flow (nodos y conectores)
   - Manejo de errores (try/catch equivalente, condiciones, scopes)
   - Controles de seguridad (permisos, cuentas de servicio, límites)
   - Observabilidad mínima (logs, registros, alertas).
3. Si el caso mezcla Power Automate con otros hubs (n8n, Make, Zapier):
   - Explicar cómo dividir responsabilidades:
     ✔ Power Automate para lo “Microsoft-native”.
     ✔ n8n/Make/Zapier para integraciones más abiertas o complejas.
4. Cuando propongas Flows:
   - Menciona los conectores específicos (ej: “SharePoint – Get items”,
     “Outlook – Send an email (V2)”, etc.), sin inventar nombres imposibles.
   - Indica inputs/outputs esperados para cada paso.
5. En contextos empresariales:
   - Señala riesgos: límites de licenciamiento, throttling, dependencias frágiles.
   - Sugiere cómo versionar y documentar los Flows.
   - Sugiere patrón de entornos (DEV/TEST/PROD) cuando sea pertinente.

Estilo:
- Profesional, claro y muy orientado a la operación real en empresas.
- Explicaciones accionables (checklists, pasos, pseudoflujos).
- Siempre que sea útil, alinea tus recomendaciones con los demás componentes AURA.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE POWER AUTOMATE
// =======================================================================

const POWER_AUTOMATE_AGENT_RAW = {
  name: 'power_automate_core',
  role: 'power_automate' as AgentRole,
  description:
    'Agente especializado en Power Automate y Microsoft 365. Diseña y optimiza Flows, integraciones y gobernanza.',
  systemPrompt: POWER_AUTOMATE_SYSTEM_PROMPT,
  allowedTools: [
    // Core status + repositorio (para plantillas y forms)
    'core.get_status',
    'core.repo.get_template',
    'core.repo.get_form',
    'core.repo.get_knowledge',

    // Automation Hub – Power Automate
    'automation.power_automate.run',
    'automation.power_automate.read_sharepoint',

    // Otros hubs (para flujos híbridos)
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.make.trigger',
    'automation.zapier.trigger',
  ],
  allowedScopes: [
    'automation',
    'power_automate',
    'm365',
    'sharepoint',
    'workflow_design',
  ] as AgentScope[],
  temperature: 0.2,
  memory: {
    lastFlows: [],
    lastSharePointPatterns: [],
    preferredPatterns: ['approval_flow', 'document_flow', 'notification_flow', 'sync_flow'],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE POWER AUTOMATE
// =======================================================================

export function registerPowerAutomateAgent() {
  try {
    const validated = validateAgentDefinition(POWER_AUTOMATE_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[powerAutomate.agent] Ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[powerAutomate.agent] Agente power_automate_core registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[powerAutomate.agent] Error registrando agente', {
      error: err.message,
    });
  }
}

// Auto–registro (puedes centralizar después en un index global si prefieres)
registerPowerAutomateAgent();
