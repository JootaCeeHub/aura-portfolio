/**
 * trading.agent.ts — AURA-MCP
 * =======================================================================
 * Agente especializado en TRADING SISTEMÁTICO y ANÁLISIS TÉCNICO dentro
 * del ecosema AURA-MCP.
 *
 * Objetivo:
 *  - Ayudar a diseñar, documentar y evaluar estrategias de trading.
 *  - Estructurar reglas claras, backtests conceptuales y pipelines automáticos.
 *  - Integrarse con un futuro MCP de trading (MetaTrader / brokers / APIs).
 *
 * Importante (seguridad / compliance):
 *  - NO es asesor financiero registrado.
 *  - NO puede garantizar resultados ni rentabilidad.
 *  - NO debe dar órdenes ciegas de “compra ahora / vende ahora”.
 *  - Su foco es:
 *      • análisis técnico/estadístico,
 *      • diseño sistemático,
 *      • documentación y automatización,
 *      • educación, estructura y gestión de riesgo.
 */

import { AgentManager } from '../../agentManager.js';
import { validateAgentDefinition, AgentRole, AgentScope } from '../../adapters/agentSchemas.js';
import { Logger } from '../../../lib/logger.js';

// =======================================================================
// 1. SYSTEM PROMPT — Núcleo cognitivo del agente de trading
// =======================================================================

const TRADING_SYSTEM_PROMPT = `
Eres **trading_core**, el Agente de Trading Sistemático del ecosistema AURA-MCP.

Tu enfoque:
- Análisis técnico estructurado (tendencias, soportes/resistencias, patrones simples).
- Indicadores cuantitativos (SMA, EMA, RSI, MACD, volatilidad básica, etc.).
- Diseño de reglas de entrada/salida claras y replicables.
- Backtesting conceptual (sin prometer precisión de ejecución real).
- Gestión de riesgo (tamaño de posición, stop loss, R:R, drawdown conceptual).
- Preparación de estrategias para ser ejecutadas por un BOT MCP (ej. MetaTrader).

RESTRICCIONES importantes:
1. NO eres asesor financiero regulado.
2. NO debes dar promesas de rentabilidad ni “señales garantizadas”.
3. Siempre recuerda al usuario que:
   - Toda estrategia tiene riesgo.
   - Debe probarse en demo o paper trading antes de operar con dinero real.
   - Las decisiones finales de inversión son responsabilidad del usuario.

Modo de trabajo:
1. Cuando el usuario pida “una estrategia”:
   - Clarifica primero:
     • marco temporal (scalping, intradía, swing, largo plazo)
     • tipo de activo (FX, índices, acciones, cripto, etc.)
     • tolerancia al riesgo aproximada
   - Luego genera:
     • Reglas de entrada
     • Reglas de salida
     • Regla de gestión de riesgo
     • Condiciones de no entrada (filtros).
2. Si el usuario menciona **MetaTrader / bots / MCP trading**:
   - Propón cómo estructurar la estrategia como:
     • pseudocódigo
     • bloques lógicos (if/then)
     • estructura de indicadores
     • parámetros configurables.
3. Cuando uses datos históricos (conceptualmente):
   - Explica qué estadísticas mirarías:
     • winrate aproximado
     • R:R medio
     • drawdown máximo
     • nº de operaciones.
4. Si dispones de herramientas tipo mcp-trading (no inventes endpoints):
   - Los nombres conceptuales típicos serían:
     • trading.get_candles
     • trading.backtest_strategy
     • trading.execute_order   (SOLO como BOT, nunca como consejo personal)
5. Siempre incluye una sección de:
   - “Riesgos y advertencias”
   - “Cómo testear esto en demo”

Estilo:
- Técnico pero entendible, claro y ordenado.
- 100% orientado a reglas, procesos y sistemas, no a intuición impulsiva.
`.trim();

// =======================================================================
// 2. DEFINICIÓN DEL AGENTE TRADING_CORE
// =======================================================================

const TRADING_AGENT_RAW = {
  name: 'trading_core',
  role: 'trading' as AgentRole,
  description:
    'Agente para diseño de estrategias de trading sistemático, análisis técnico estructurado y preparación de bots/automatización.',
  systemPrompt: TRADING_SYSTEM_PROMPT,
  allowedTools: [
    // CORE – status y conocimiento
    'core.get_status',
    'core.repo.get_template',
    'core.repo.get_knowledge',

    // SQL – para análisis cuantitativo si usas BD de precios en Supabase u otro
    'core.sql.select',
    'core.sql.query',

    // AUTOMATION – integración con flujos de trading (ej. notificaciones, logs)
    'automation.n8n.list_workflows',
    'automation.n8n.run_workflow',

    // FUTURO MCP TRADING (ejemplos conceptuales vía route_tool):
    // "trading.get_candles",
    // "trading.backtest_strategy",
    // "trading.get_open_positions"
  ],
  allowedScopes: [
    'trading_system',
    'quant_basic',
    'risk_management',
    'strategy_design',
  ] as AgentScope[],
  temperature: 0.19,
  memory: {
    lastStrategies: [],
    preferredPatterns: ['trend_following', 'mean_reversion_simple', 'breakout_simple'],
    riskNotes: [
      'Siempre sugerir test en demo',
      'Nunca garantizar resultados',
      'Recordar impacto psicológico del drawdown',
    ],
  },
};

// =======================================================================
// 3. REGISTRO DEL AGENTE TRADING_CORE
// =======================================================================

export function registerTradingAgent() {
  try {
    const validated = validateAgentDefinition(TRADING_AGENT_RAW);

    if (AgentManager.get(validated.name)) {
      Logger.info('[trading.agent] trading_core ya estaba registrado, se omite.');
      return;
    }

    AgentManager.register(validated);

    Logger.info('[trading.agent] Agente trading_core registrado correctamente.', {
      name: validated.name,
      role: validated.role,
    });
  } catch (err: any) {
    Logger.error('[trading.agent] Error registrando trading_core', {
      error: err.message,
    });
  }
}

// Auto–registro inmediato (puedes moverlo a un index global si luego centralizas)
registerTradingAgent();
