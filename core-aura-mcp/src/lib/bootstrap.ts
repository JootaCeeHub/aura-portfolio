/**
 * AURA-MCP-Core — Bootstrap Consolidado
 * -------------------------------------
 * Versión unificada con:
 *  - n8n
 *  - Graphiti MCP
 *  - Supabase
 *  - OpenAI / Azure
 *  - Tavily Search
 *  - Power Automate
 *  - SharePoint
 *  - Microsoft Graph
 *  - Make.com
 *  - Zapier
 *  - GitHub API
 *  - Docker Engine
 *
 * 100% alineado con la Arquitectura AURA-MCP.
 */

import { Logger } from './logger.js';
import { Config } from './config.js';

type HealthStatus = 'up' | 'down' | 'unknown';

export interface ServiceHealth {
  name: string;
  url?: string;
  status: HealthStatus;
  details?: string;
}

const TIMEOUT = 4000;

// Utilidad fetch con timeout
async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeout = TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export class Bootstrap {
  /**
   * Ejecutado desde main.ts
   */
  static async init() {
    Logger.info('[Bootstrap] Iniciando verificación extendida de servicios…');

    const results: ServiceHealth[] = [];

    // --------------------------
    // 1. n8n
    // --------------------------
    if (Config.n8nBaseUrl) {
      results.push(await this.checkN8n());
    } else {
      results.push({
        name: 'n8n',
        status: 'unknown',
        details: 'N8N_BASE_URL no configurado',
      });
    }

    // --------------------------
    // 2. Graphiti MCP
    // --------------------------
    if (Config.graphitiBaseUrl) {
      results.push(await this.checkGraphiti());
    } else {
      results.push({
        name: 'graphiti-mcp',
        status: 'unknown',
        details: 'GRAPHITI_BASE_URL no configurado',
      });
    }

    // --------------------------
    // 3. Supabase
    // --------------------------
    if (Config.supabaseUrl && Config.supabaseAnonKey) {
      results.push(await this.checkSupabase());
    } else {
      results.push({
        name: 'supabase',
        status: 'unknown',
        details: 'SUPABASE_URL o SUPABASE_ANON_KEY no configurado',
      });
    }

    // --------------------------
    // 4. OpenAI
    // --------------------------
    results.push(await this.checkOpenAI());

    // --------------------------
    // 5. Tavily Search
    // --------------------------
    results.push(await this.checkTavily());

    // --------------------------
    // 6. Power Automate
    // --------------------------
    results.push(await this.checkPowerAutomate());

    // --------------------------
    // 7. SharePoint
    // --------------------------
    results.push(await this.checkSharePoint());

    // --------------------------
    // 8. Microsoft Graph
    // --------------------------
    results.push(await this.checkMicrosoftGraph());

    // --------------------------
    // 9. Make.com
    // --------------------------
    results.push(await this.checkMake());

    // --------------------------
    // 10. Zapier
    // --------------------------
    results.push(await this.checkZapier());

    // --------------------------
    // 11. GitHub API
    // --------------------------
    results.push(await this.checkGitHub());

    // --------------------------
    // 12. Docker Daemon
    // --------------------------
    results.push(await this.checkDocker());

    // Imprimir resumen
    this.printSummary(results);
  }

  // =========================================================================
  // SERVICIOS CORE
  // =========================================================================

  static async checkN8n(): Promise<ServiceHealth> {
    const base = Config.n8nBaseUrl!;
    const urls = [`${base}/healthz`, `${base}/rest/health`, base];

    for (const url of urls) {
      try {
        const res = await safeFetch(url, { method: 'GET' }, 3500);
        if (res.ok) {
          return { name: 'n8n', status: 'up', url };
        }
      } catch {
        continue;
      }
    }

    return {
      name: 'n8n',
      status: 'down',
      url: base,
      details: 'No responde healthz/rest/health',
    };
  }

  static async checkGraphiti(): Promise<ServiceHealth> {
    const url = `${Config.graphitiBaseUrl}/health`;
    try {
      const res = await safeFetch(url, { method: 'GET' });
      return res.ok
        ? { name: 'graphiti-mcp', status: 'up', url }
        : { name: 'graphiti-mcp', status: 'down', url, details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'graphiti-mcp', status: 'down', url, details: err.message };
    }
  }

  static async checkSupabase(): Promise<ServiceHealth> {
    const url = `${Config.supabaseUrl}/rest/v1`;
    try {
      const res = await safeFetch(url, { method: 'GET' });
      return {
        name: 'supabase',
        status: 'up',
        url,
        details: `HTTP ${res.status}`,
      };
    } catch (err: any) {
      return { name: 'supabase', status: 'down', url, details: err.message };
    }
  }

  // =========================================================================
  // IA / BÚSQUEDA
  // =========================================================================

  static async checkOpenAI(): Promise<ServiceHealth> {
    if (!Config.openaiKey)
      return { name: 'openai', status: 'unknown', details: 'OPENAI_API_KEY no configurada' };

    try {
      const res = await safeFetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${Config.openaiKey}` },
      });
      return res.ok
        ? { name: 'openai', status: 'up' }
        : { name: 'openai', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'openai', status: 'down', details: err.message };
    }
  }

  static async checkTavily(): Promise<ServiceHealth> {
    if (!Config.tavilyApiKey)
      return { name: 'tavily', status: 'unknown', details: 'TAVILY_API_KEY no configurada' };

    try {
      const res = await safeFetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': Config.tavilyApiKey,
        },
        body: JSON.stringify({ query: 'bootstrap test', max_results: 1 }),
      });

      return res.ok
        ? { name: 'tavily', status: 'up' }
        : { name: 'tavily', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'tavily', status: 'down', details: err.message };
    }
  }

  // =========================================================================
  // AUTOMATION PLATFORMS
  // =========================================================================

  static async checkPowerAutomate(): Promise<ServiceHealth> {
    if (!Config.msGraphToken)
      return {
        name: 'power_automate',
        status: 'unknown',
        details: 'MS_GRAPH_TOKEN no configurado',
      };

    try {
      const res = await safeFetch(
        'https://api.powerautomate.com/providers/Microsoft.ProcessSimple/environments?api-version=2016-11-01',
        { headers: { Authorization: `Bearer ${Config.msGraphToken}` } }
      );

      return res.ok
        ? { name: 'power_automate', status: 'up' }
        : { name: 'power_automate', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'power_automate', status: 'down', details: err.message };
    }
  }

  static async checkSharePoint(): Promise<ServiceHealth> {
    if (!Config.msGraphToken)
      return { name: 'sharepoint', status: 'unknown', details: 'MS_GRAPH_TOKEN no configurado' };

    try {
      const res = await safeFetch('https://graph.microsoft.com/v1.0/sites?top=1', {
        headers: { Authorization: `Bearer ${Config.msGraphToken}` },
      });

      return res.ok
        ? { name: 'sharepoint', status: 'up' }
        : { name: 'sharepoint', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'sharepoint', status: 'down', details: err.message };
    }
  }

  static async checkMicrosoftGraph(): Promise<ServiceHealth> {
    if (!Config.msGraphToken)
      return { name: 'ms_graph', status: 'unknown', details: 'MS_GRAPH_TOKEN no configurado' };

    try {
      const res = await safeFetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${Config.msGraphToken}` },
      });

      return res.ok
        ? { name: 'ms_graph', status: 'up' }
        : { name: 'ms_graph', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'ms_graph', status: 'down', details: err.message };
    }
  }

  static async checkMake(): Promise<ServiceHealth> {
    if (!Config.makeApiKey)
      return { name: 'make', status: 'unknown', details: 'MAKE_API_KEY no configurado' };

    try {
      const res = await safeFetch('https://api.make.com/v2/me', {
        headers: { 'X-API-Key': Config.makeApiKey },
      });

      return res.ok
        ? { name: 'make', status: 'up' }
        : { name: 'make', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'make', status: 'down', details: err.message };
    }
  }

  static async checkZapier(): Promise<ServiceHealth> {
    if (!Config.zapierToken)
      return { name: 'zapier', status: 'unknown', details: 'ZAPIER_TOKEN no configurado' };

    try {
      const res = await safeFetch('https://nla.zapier.com/api/v1/dynamic/', {
        headers: { Authorization: `Bearer ${Config.zapierToken}` },
      });

      return res.ok
        ? { name: 'zapier', status: 'up' }
        : { name: 'zapier', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'zapier', status: 'down', details: err.message };
    }
  }

  // =========================================================================
  // DEVOPS / INFRASTRUCTURE
  // =========================================================================

  static async checkGitHub(): Promise<ServiceHealth> {
    if (!Config.githubToken)
      return { name: 'github', status: 'unknown', details: 'GITHUB_TOKEN no configurado' };

    try {
      const res = await safeFetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${Config.githubToken}` },
      });

      return res.ok
        ? { name: 'github', status: 'up' }
        : { name: 'github', status: 'down', details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { name: 'github', status: 'down', details: err.message };
    }
  }

  static async checkDocker(): Promise<ServiceHealth> {
    try {
      const res = await safeFetch('http://127.0.0.1:2375/_ping', { method: 'GET' });
      return res.ok
        ? { name: 'docker', status: 'up' }
        : { name: 'docker', status: 'down', details: `HTTP ${res.status}` };
    } catch {
      return {
        name: 'docker',
        status: 'down',
        details: 'Daemon no disponible en 127.0.0.1:2375',
      };
    }
  }

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================

  private static printSummary(results: ServiceHealth[]) {
    Logger.info('===========================================');
    Logger.info('   RESUMEN BOOTSTRAP AURA-MCP — CONSOLIDADO');
    Logger.info('===========================================');

    for (const r of results) {
      Logger.info(
        ` - ${r.name}: ${r.status.toUpperCase()}` +
          (r.url ? ` (${r.url})` : '') +
          (r.details ? ` → ${r.details}` : '')
      );
    }

    const downs = results.filter((r) => r.status === 'down');
    if (downs.length > 0) {
      Logger.warn('[Bootstrap] Servicios críticos presentan problemas', { downs });
    } else {
      Logger.info('[Bootstrap] Todos los servicios esenciales están UP.');
    }
  }
}

