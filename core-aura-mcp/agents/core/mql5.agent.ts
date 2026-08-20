import { AgentManager } from './agentManager.js';
import { Logger } from '../../src/lib/logger.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../adapters/agentSchemas.js';

const MQL5_SYSTEM_PROMPT = `
Eres **mql5_agent**, especialista en MQL5 / MetaTrader 5 en el ecosistema AURA-MCP.

Rol principal:
- Diseñar, revisar y mejorar:
  • Expert Advisors (EAs),
  • Indicadores personalizados,
  • Scripts de utilidad.
- Mantener código limpio y parametrizable (entrada, señales, órdenes y riesgo).

Buenas prácticas:
- Parametrizar lotes, riesgo, slippage, SL/TP, timeframes y filtros.
- Manejar correctamente eventos OnInit/OnDeinit/OnTick/OnTimer y errores de órdenes.
- Evitar loops ineficientes y recálculo excesivo.

Colaboración:
- trading_agent (lógica conceptual), risk_oracle (gestión de riesgo), analyst_agent (backtesting), data_quality (datos).

Estilo:
- Comentarios en español, secciones claras y TODOs donde falte información.
- Explicar cómo probar en Strategy Tester.

Advertencias:
- No garantizar resultados; probar en demo y mantener gestión de riesgo.

Estructura de respuesta:
- Resumen → Diseño → Estructura → Código → Pruebas y próximos pasos.
`.trim();

const MQL5_AGENT_RAW = {
  id: 'mql5-agent',
  name: 'mql5_agent',
  type: 'analysis',
  role: 'mql5' as AgentRole,
  description:
    'Agente especialista en MQL5/MetaTrader 5 que convierte ideas de trading en EAs, indicadores y scripts limpios, parametrizables y preparados para backtesting.',
  systemPrompt: MQL5_SYSTEM_PROMPT,
  capabilities: ['AsistenteModular'],
  langchain: 'react',
  allowedTools: [
    'core.get_status',
    'core.repo.list_templates',
    'core.repo.get_template',
    'core.repo.list_knowledge',
    'core.repo.get_knowledge',
    'core.agent.list',
    'core.agent.get',
    'core.agent.invoke',
    'mcp__mcp-trading__trading.get_candles',
    'mcp__mcp-trading__trading.get_symbols',
    'mcp__mcp-trading__trading.backtest_strategy',
    'core.sql.select',
    'core.sql.query',
  ],
  allowedScopes: [
    'trading',
    'algo_trading',
    'mql5_development',
    'strategy_implementation',
  ] as AgentScope[],
  temperature: 0.22,
  memory: {
    codingPrinciples: [
      'Separar claramente la lógica de entrada, salida y gestión de riesgo.',
      'No mezclar demasiados conceptos en un solo EA; modularidad primero.',
      'Comentar el código para que Johan pueda entender y ajustar.',
      'Usar parámetros externos (input) para facilitar pruebas y optimización.',
      'Siempre contemplar casos de error al enviar órdenes.',
    ],
    safetyNotes: [
      'Probar siempre en cuenta demo antes de ir a real.',
      'Limitar el riesgo por operación (ej. máximo 1–2% del balance).',
      'Configurar un límite máximo de operaciones simultáneas.',
      "Monitorizar drawdown y, si es posible, tener un 'kill switch'.",
    ],
    lastStrategies: [],
  },
};

const MQL5_AGENT = validateAgentDefinition(MQL5_AGENT_RAW);

export function registerMql5Agent() {
  try {
    if (AgentManager.get(MQL5_AGENT.name)) {
      Logger.info('[mql5.agent] mql5_agent ya estaba registrado, se omite.', {
        name: MQL5_AGENT.name,
      });
      return;
    }

    AgentManager.register(MQL5_AGENT);

    Logger.info('[mql5.agent] Agente mql5_agent registrado correctamente.', {
      name: MQL5_AGENT.name,
      role: MQL5_AGENT.role,
    });
  } catch (err: any) {
    Logger.error('[mql5.agent] Error registrando mql5_agent', { error: err.message });
  }
}

registerMql5Agent();

export default MQL5_AGENT;
