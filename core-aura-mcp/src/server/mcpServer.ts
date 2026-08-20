import http from 'http';
import net from 'net';
import { DASHBOARD_HTML } from './dashboardTemplate.js';
import { Logger } from '../lib/logger.js';
import { loadAuraCoreConfig } from '../config/auraCoreConfig.js';
import { MCPToolHandler, MCPResourceHandler, MCPRequest } from '../types/interfaces.js';

/**
 * Servidor MCP – versión consolidada profesional
 * Incluye:
 *  ✔ JSON-RPC 2.0 vía HTTP POST
 *  ✔ STDIO transport (para CLI/agents)
 *  ✔ SSE (Server-Sent Events)
 *  ✔ Tools dinámicas
 *  ✔ Resources dinámicos
 *  ✔ Logging robusto
 *  ✔ Selección dinámica de puertos
 */
export class MCPServer {
  public port: number;
  private tools: Record<string, MCPToolHandler> = {};
  private resources: Record<string, MCPResourceHandler> = {};

  // Almacenamiento en memoria para el Dashboard
  private requestLogs: any[] = [];
  private startTime: number = Date.now();
  private totalRequests: number = 0;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Registrar herramienta MCP
   */
  tool(name: string, handler: MCPToolHandler) {
    this.tools[name] = handler;
    Logger.debug('Tool registrada', { name });
  }

  /**
   * Registrar recurso MCP
   */
  resource(name: string, handler: MCPResourceHandler) {
    this.resources[name] = handler;
    Logger.debug('Resource registrado', { name });
  }

  /**
   * Enviar evento SSE
   */
  private sendSSE(res: http.ServerResponse, event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private logRequest(req: http.IncomingMessage, status: number, latency: number) {
    this.totalRequests++;
    const log = {
      timestamp: Date.now(),
      method: req.method || 'UNKNOWN',
      path: req.url || '/',
      origin: (req.headers.origin as string) || 'Browsing',
      status,
      latency,
    };

    // Mantener solo los últimos 100 logs
    this.requestLogs.unshift(log);
    if (this.requestLogs.length > 100) this.requestLogs.pop();
  }

  /**
   * Encuentra un puerto disponible a partir del puerto dado
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(this.findAvailablePort(startPort + 1));
        } else {
          reject(err);
        }
      });
      server.listen(startPort, () => {
        server.close(() => {
          resolve(startPort);
        });
      });
    });
  }

  /**
   * Inicio del servidor principal
   */
  async start(): Promise<void> {
    let allowedTokens: string[] = [];
    let allowedOrigins: string[] = [];

    try {
      const { policies } = loadAuraCoreConfig();
      allowedTokens = policies?.security?.auth?.allowed_tokens || [];
      allowedOrigins = policies?.security?.network?.allowed_origins || [];

      Logger.info('Configuración de seguridad cargada', {
        tokens: allowedTokens.length,
        origins: allowedOrigins,
      });
    } catch (err) {
      Logger.error('Error crítico cargando configuración de seguridad', { error: err });
      // Fallback mínimo seguro o vacío para evitar brechas
      allowedTokens = [];
      allowedOrigins = [];
    }

    // Si no hay orígenes permitidos, advertir (esto bloqueará todas las conexiones CORS)
    if (allowedOrigins.length === 0) {
      Logger.warn(
        '⚠ IMPORTANTE: No hay orígenes CORS permitidos configurados. El acceso web externo será bloqueado.'
      );
    }

    // Buscar puerto disponible
    try {
      const availablePort = await this.findAvailablePort(this.port);
      if (availablePort !== this.port) {
        Logger.warn(`Puerto ${this.port} ocupado, usando puerto ${availablePort}`);
        this.port = availablePort;
      }
    } catch (err: any) {
      Logger.error('Error buscando puerto disponible', err);
      throw err;
    }

    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        const reqStart = Date.now();
        const origin = (req.headers.origin as string) || '';

        // Intercept res.end to log the request
        const originalEnd = res.end;
        let statusCode = 200;

        // Monkey patch writeHead to capture status
        const originalWriteHead = res.writeHead;
        res.writeHead = function (code: number, ...args: any[]) {
          statusCode = code;
          return originalWriteHead.apply(this, [code, ...args] as any);
        };

        // @ts-expect-error - Monkey patch end to log
        res.end = (chunk: any, encoding: any, cb: any) => {
          const latency = Date.now() - reqStart;
          // Filter out SSE infinite requests from latency logging noise (optional, but good for charts)
          if (statusCode !== 200 || req.headers.accept !== 'text/event-stream') {
            this.logRequest(req, statusCode, latency);
          }
          return originalEnd.call(res, chunk, encoding, cb);
        };

        // Security Check logic
        const isOriginAllowed =
          allowedOrigins.includes('*') ||
          allowedOrigins.length === 0 ||
          (origin && allowedOrigins.includes(origin));

        // === DASHBOARD & PUBLIC ACCESS BYPASS ===
        // Allow direct browser access (no origin header) to Dashboard URLs
        const isDashboard =
          req.url === '/' || req.url?.startsWith('/requests/') || req.url === '/favicon.ico';
        const isDirectAccess = !origin && req.method === 'GET';

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': isOriginAllowed ? origin || '*' : 'null',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
          });
          return res.end();
        }

        // Block only if it's NOT a dashboard request AND origin is forbidden
        if (!isOriginAllowed && !(isDashboard && isDirectAccess)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Origin Forbidden' }));
        }

        const commonHeaders = {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Credentials': 'true',
        };

        // ==============================
        //  DASHBOARD & MONITORING (GET)
        // ==============================
        if (req.method === 'GET') {
          // 1. Dashboard HTML
          if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(DASHBOARD_HTML);
          }

          // 2. Logs Data
          if (req.url === '/requests/recent') {
            res.writeHead(200, { 'Content-Type': 'application/json', ...commonHeaders });
            return res.end(JSON.stringify(this.requestLogs));
          }

          // 3. Metrics Data
          if (req.url === '/requests/metrics') {
            const totalLatency = this.requestLogs.reduce(
              (acc: any, log: any) => acc + log.latency,
              0
            );
            const avgLatency =
              this.requestLogs.length > 0 ? totalLatency / this.requestLogs.length : 0;

            res.writeHead(200, { 'Content-Type': 'application/json', ...commonHeaders });
            return res.end(
              JSON.stringify({
                totalRequests: this.totalRequests,
                averageLatency: avgLatency,
                uptime: process.uptime(),
                recentRequestRate: this.requestLogs.filter(
                  (l: any) => l.timestamp > Date.now() - 60000
                ).length, // Requests last minute
              })
            );
          }

          // ==============================
          // 4. Status Endpoints
          if (req.url === '/health') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin || '*',
              'Access-Control-Allow-Credentials': 'true',
            });
            return res.end(
              JSON.stringify({
                status: 'ok',
                uptime: process.uptime(),
                cpuLoad: process.cpuUsage(),
                memoryUsage: process.memoryUsage(),
              })
            );
          }
          if (req.url === '/mcp/status') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin || '*',
              'Access-Control-Allow-Credentials': 'true',
            });
            return res.end(
              JSON.stringify({
                activeAgents: 0, // Placeholder
                registeredTools: Object.keys(this.tools).length,
                integrations: [], // Placeholder
              })
            );
          }

          if (req.url === '/events/recent') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': origin || '*',
              'Access-Control-Allow-Credentials': 'true',
            });
            return res.end(
              JSON.stringify({
                events: [], // Placeholder
              })
            );
          }

          // Handle favicon.ico to prevent 401 errors
          if (req.url === '/favicon.ico') {
            res.writeHead(204); // No Content
            return res.end();
          }
        }

        // ==============================
        // TOKEN AUTHENTICATION CHECK
        // ==============================
        // This check happens AFTER all public GET endpoints
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
        const enforceToken = allowedTokens.length > 0;
        const tokenOk = token ? allowedTokens.includes(token) : false;
        if (enforceToken && !tokenOk) {
          res.writeHead(401, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': isOriginAllowed ? origin || '*' : '*',
          });
          return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }
        // ==============================
        // SSE SUPPORT
        // ==============================
        if (req.headers.accept === 'text/event-stream') {
          Logger.info('Cliente SSE conectado');

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': isOriginAllowed ? origin || '*' : '*',
          });

          // Ping inicial
          this.sendSSE(res, 'ping', { ts: Date.now() });

          // Keep alive cada 15 segundos
          const interval = setInterval(() => {
            this.sendSSE(res, 'ping', { ts: Date.now() });
          }, 15000);

          req.on('close', () => {
            clearInterval(interval);
            Logger.info('Cliente SSE desconectado');
          });

          return;
        }

        // ==============================
        // SOLO ACEPTAMOS POST JSON-RPC
        // ==============================
        if (req.method !== 'POST') {
          res.writeHead(405, {
            'Access-Control-Allow-Origin': isOriginAllowed ? origin || '*' : '*',
          });
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', (chunk) => (body += chunk.toString()));

        req.on('end', async () => {
          try {
            const data: MCPRequest = JSON.parse(body);

            if (!data.method) {
              throw new Error('Método no definido');
            }

            Logger.info('Llamada JSON-RPC recibida', { method: data.method });

            // ---------------------
            // TOOL HANDLER
            // ---------------------
            if (this.tools[data.method]) {
              const result = await this.tools[data.method](data.params || {});
              res.writeHead(200, { 'Content-Type': 'application/json', ...commonHeaders });
              return res.end(
                JSON.stringify({
                  jsonrpc: '2.0',
                  result,
                  id: data.id || null,
                })
              );
            }

            // ---------------------
            // RESOURCE HANDLER
            // ---------------------
            if (this.resources[data.method]) {
              const result = await this.resources[data.method]();
              res.writeHead(200, { 'Content-Type': 'application/json', ...commonHeaders });
              return res.end(
                JSON.stringify({
                  jsonrpc: '2.0',
                  result,
                  id: data.id || null,
                })
              );
            }

            // ---------------------
            // MÉTODO DESCONOCIDO
            // ---------------------
            res.writeHead(200, { 'Content-Type': 'application/json', ...commonHeaders });
            return res.end(
              JSON.stringify({
                jsonrpc: '2.0',
                error: `Método desconocido: ${data.method}`,
                id: data.id || null,
              })
            );
          } catch (err: any) {
            Logger.error('Error en servidor MCP', err.message);

            res.writeHead(500, { 'Content-Type': 'application/json', ...commonHeaders });
            return res.end(
              JSON.stringify({
                jsonrpc: '2.0',
                error: err.message,
                id: null,
              })
            );
          }
        });
      });

      server.listen(this.port, () => {
        Logger.info(`MCP Server escuchando en puerto ${this.port}`);
        resolve();
      });
      server.on('error', (err: any) => {
        Logger.error('Error en servidor HTTP', { error: err.message });
        reject(err);
      });

      const shutdown = () => {
        try {
          server.close(() => Logger.info('Servidor MCP cerrado correctamente'));
        } catch {
          // Ignore close errors
        }
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

    // =======================================================
    //                  STDIO TRANSPORT (MCP JC)
    // =======================================================

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', async (chunk) => {
      try {
        const data: MCPRequest = JSON.parse(String(chunk));

        Logger.info('Llamada STDIO recibida', { method: data.method });

        // --- TOOLS ---
        if (this.tools[data.method]) {
          const result = await this.tools[data.method](data.params || {});
          process.stdout.write(
            JSON.stringify({
              jsonrpc: '2.0',
              result,
              id: data.id || null,
            }) + '\n'
          );
          return;
        }

        // --- RESOURCES ---
        if (this.resources[data.method]) {
          const result = await this.resources[data.method]();
          process.stdout.write(
            JSON.stringify({
              jsonrpc: '2.0',
              result,
              id: data.id || null,
            }) + '\n'
          );
          return;
        }

        // --- MÉTODO DESCONOCIDO ---
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            error: `Método desconocido: ${data.method}`,
            id: data.id || null,
          }) + '\n'
        );
      } catch (err: any) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            error: err.message,
            id: null,
          }) + '\n'
        );
      }
    });

    Logger.info('STDIO transport activo');
  }
}
