/**
 * excel.agent.ts — AURA-MCP
 * =======================================================================
 * Agente especializado en manipulación, limpieza y transformación de datos
 * en Excel/CSV/planillas. Forma parte del ecosistema cognitivo distribuido
 * de AURA y se integra con:
 *
 *  - CoreTools Excel (cuando se implemente mcp-excel)
 *  - n8n para flujos de ETL ligeros
 *  - PowerAutomate cuando corresponda
 *  - Repositorio de templates (para informes y data-cleaning)
 *
 * Este agente está diseñado para:
 *  ✔ Limpieza de datos (na, outliers, duplicados, ruidos)
 *  ✔ Normalización y transformación
 *  ✔ Sugerir fórmulas óptimas (Excel, PowerQuery, TS/Python)
 *  ✔ Generar estructuras de tablas (tipado, validaciones, perfiles)
 *  ✔ Automatizar ETL repetitivos
 *  ✔ Preparar datasets para carga a base de datos
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT EXCEL (lógica principal del agente)
// =======================================================================

const EXCEL_SYSTEM_PROMPT = `
Eres **excel_core**, el Agente Maestro de Excel, Data Cleaning y Transformaciones
Tabulares del ecosistema AURA-MCP.

Tu especialidad:
- Limpieza profunda de datasets
- Normalización y estandarización
- Generación de fórmulas avanzadas (Excel, PQ, DAX, Python, TS)
- Análisis estructural de datos
- Reportes y automatizaciones asociadas a planillas
- Preparación de datasets para n8n, Power Automate o pipelines ETL

Reglas de operación:
1. Entrega SIEMPRE pasos concretos y replicables.
2. Cuando generes fórmulas, entrega versión:
   - Excel estándar
   - PowerQuery M (si aplica)
   - Python/Pandas (si aporta valor)
3. No inventes columnas ni datos: infiere con claridad.
4. Cuando el usuario describe un dataset, reformúlalo como tabla estructurada.
5. Si detectas problemas como NA, duplicados, ruido o campos incorrectos,
   ofrece un plan de corrección en 1-3 pasos más una versión automatizable.
6. Cuando sea necesario, sugiere flujos n8n o scripts AURA para automatizar la limpieza.
7. Si el usuario planea integrar esto con BD, prepara esquema SQL (CREATE TABLE)
   y mapea tipos de datos.
8. Mantén estilo profesional, claro, directo.

Tu misión es maximizar la integridad, claridad y utilidad de los datos.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE EXCEL
// =======================================================================

const EXCEL_AGENT_RAW = {
  name: 'excel_core',
  role: 'excel' as AgentRole,
  description:
    'Agente experto en datos tabulares, limpieza, normalización y preparación de planillas Excel/CSV para análisis o automatización.',
  systemPrompt: EXCEL_SYSTEM_PROMPT,
  allowedTools: [
    // CORE
    'core.get_status',
    'core.repo.get_template',
    'core.repo.get_form',

    // SQL helpers (útil para preparar datos para BD)
    'core.sql.select',
    'core.sql.query',

    // AUTOMATION
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',

    // EXCEL MCP (cuando implementes mcp-excel)
    // "excel.read_range",
    // "excel.write_range",
    // "excel.clean_data",
    // "excel.generate_report"
  ],
  allowedScopes: [
    'data_cleaning',
    'etl',
    'excel_formulas',
    'powerquery',
    'reporting',
  ] as AgentScope[],
  temperature: 0.15,
  memory: {
    lastDatasets: [],
    lastFixes: [],
    lastFormulas: [],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE
// =======================================================================

export function registerExcelAgent() {
  try {
    const validated = validateAgentDefinition(EXCEL_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[excel.agent] Ya estaba registrado, se omite.');
      return;
    }

    AgentManager.register(validated);

    Logger.info('[excel.agent] Agente registrado correctamente', {
      name: validated.name,
    });
  } catch (err: any) {
    Logger.error('[excel.agent] Error registrando agente', {
      error: err.message,
    });
  }
}

registerExcelAgent();
