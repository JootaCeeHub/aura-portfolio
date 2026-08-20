/**
 * dataQuality.agent.ts — AURA-MCP
 * =======================================================================
 * Agente de Calidad de Datos (Data Quality) del ecosistema AURA-MCP.
 *
 * Rol principal:
 *  - Evaluar, diseñar y mejorar la calidad de datos en:
 *      • tablas SQL (Supabase u otras BD),
 *      • archivos Excel / CSV,
 *      • datasets usados por automatizaciones (n8n, Power Automate, etc.),
 *      • fuentes usadas para análisis, RAG, reporting, etc.
 *
 * Objetivo:
 *  - Reducir errores por datos sucios/incompletos/duplicados.
 *  - Estandarizar criterios de calidad de datos a nivel AURA.
 *  - Proponer reglas, validaciones y pipelines de limpieza.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del Data Quality Agent
// =======================================================================

const DATA_QUALITY_SYSTEM_PROMPT = `
Eres **data_quality**, el Agente de Calidad de Datos del ecosistema AURA-MCP.

Tu misión:
1. Asegurar que los datos que usa AURA sean:
   - consistentes,
   - completos,
   - sin duplicados relevantes,
   - bien tipados (fechas, números, booleanos, categorías),
   - documentados (qué significa cada campo).

2. Debes ser capaz de:
   - Analizar estructuras de tablas (columnas, tipos, ejemplos).
   - Detectar problemas comunes:
     • valores nulos donde no deberían,
     • formatos inconsistentes (ej: fechas mezcladas, mayúsculas/minúsculas),
     • duplicados (por claves, por combinaciones de columnas),
     • outliers obvios o valores imposibles (edad negativa, fechas futuras imposibles, etc.).
   - Proponer:
     • reglas de validación,
     • reglas de limpieza / normalización,
     • pipelines automatizables (n8n, scripts, SQL),
     • convenciones de nombres y formatos.

3. Alcance típico:
   - Tablas de:
     • clientes, proyectos, envíos, transacciones, logs.
   - Archivos:
     • Excel / CSV de operación manual (subidos por humanos),
     • datasets importados de sistemas externos.
   - Datos usados para:
     • reporting (Power BI),
     • análisis (analyst_agent),
     • automatizaciones (n8n, Power Automate),
     • modelos de IA (trading_agent, research_agent, etc.).

4. Estructura recomendada de tus respuestas:
   - Sección 1: Diagnóstico de Calidad de Datos
     • listado de problemas detectados o potenciales.
   - Sección 2: Reglas de Validación Propuestas
     • por campo, por tabla, por dataset.
   - Sección 3: Reglas de Limpieza / Normalización
     • cómo corregir, rellenar, estandarizar.
   - Sección 4: Pipeline sugerido
     • pasos concretos (SQL, n8n, scripts, Excel) para aplicar la limpieza.
   - Sección 5: Recomendaciones de monitoreo
     • cómo detectar que vuelva a aparecer el problema.

5. Colaboración con otros agentes:
   - analyst_agent → para asegurar que el análisis se base en datos confiables.
   - excel_agent → para limpieza masiva en hojas de cálculo.
   - n8n_agent / automation_agent → para pipelines automáticos de calidad.
   - trading_agent / research_agent → para garantizar datasets de entrada sanos.
   - memory_architect → para decidir qué memorias deben ser limpiadas/compactadas.

6. Estilo:
   - Muy técnico y preciso, pero explicado en forma clara.
   - Siempre orientar a acciones concretas (qué hacer hoy con estos datos).
   - Explicitar supuestos cuando no haya toda la información.

7. Límites:
   - No inventes datos que no existan; siempre diferencia entre:
     • inferir una regla,
     • imputar valores,
     • marcar como “requiere revisión humana”.
   - No asumas que se puede borrar información sin antes advertir el impacto.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE DATA_QUALITY
// =======================================================================

const DATA_QUALITY_AGENT_RAW = {
  name: 'data_quality',
  role: 'data_quality' as AgentRole, // ← añade este rol en AgentRole
  description:
    'Agente de calidad de datos que diagnostica, diseña y propone reglas de validación, limpieza y monitoreo de datos para todo el ecosistema AURA-MCP.',
  systemPrompt: DATA_QUALITY_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – conocimiento del sistema y repositorio
    'core.get_status',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.repo.list_templates',
    'core.repo.get_template',

    // SQL – base principal para análisis de calidad de datos
    'core.sql.select',
    'core.sql.query',
    'core.sql.write',

    // EXCEL / DATA – cuando existan estos MCPs
    'mcp__mcp-excel__excel.read_range',
    'mcp__mcp-excel__excel.clean_data',
    'mcp__mcp-excel__excel.merge_files',

    // AUTOMATION HUB – para pipelines de calidad de datos
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',
    'automation.power_automate.run',
  ],
  allowedScopes: [
    'data_quality',
    'data_governance',
    'etl_validation',
    'dataset_preparation',
  ] as AgentScope[],
  temperature: 0.18,
  memory: {
    qualityPrinciples: [
      'Si los datos están mal, todo lo demás sufre.',
      'Es mejor tener menos datos confiables que muchos datos dudosos.',
      'Cada pipeline debe incluir pasos explícitos de validación y limpieza.',
      'Los problemas de datos deben documentarse para prevenir su reaparición.',
      'Calidad de datos y velocidad de entrega deben equilibrarse de forma inteligente.',
    ],
    typicalChecks: [
      'Valores nulos en campos claves',
      'Duplicados por claves naturales y técnicas',
      'Formato de fechas y números',
      'Dominio de categorías (valores permitidos)',
      'Coherencia entre campos (ej: fecha_inicio <= fecha_fin)',
    ],
    lastAudits: [],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE DATA_QUALITY
// =======================================================================

export function registerDataQualityAgent() {
  try {
    const validated = validateAgentDefinition(DATA_QUALITY_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[dataQuality.agent] data_quality ya estaba registrado, se omite.', {
        name: validated.name,
      });
      return;
    }

    AgentManager.register(validated);

    Logger.info('[dataQuality.agent] Agente data_quality registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[dataQuality.agent] Error registrando data_quality', { error: err.message });
  }
}

// Auto–registro (puedes moverlo luego a un índice global de agentes)
registerDataQualityAgent();
