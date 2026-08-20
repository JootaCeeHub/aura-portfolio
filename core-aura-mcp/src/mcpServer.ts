// import crypto from 'crypto';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from './lib/logger.js';
import { AuthService } from './lib/auth.js';
import {
  createAuthMiddleware,
  requireAuth,
  requireScope,
  rateLimitTokenGeneration,
  securityHeaders,
} from './lib/authMiddleware.js';
import { metricsCollector } from './lib/metrics.js';
import mcpRouter from './api/routes/mcp.js';
import configRouter from './api/routes/config.js';

// Ejemplo: integrar middleware en una app Express
export function createMcpServer() {
  // Crear estado mínimo para uso runtime local (puede sustituirse por startServer para tests)
  const state = {
    modules: [{ name: 'orchestrator', version: '0.1.0', healthy: true } as any],
    logs: [] as any[],
    startTime: Date.now(),
  };
  return createApp(state);
}

// Handler para mensajes de colas/sockets: extraer correlationId del mensaje y ejecutar dentro del contexto
export function handleIncomingMessage(msg: any) {
  const incomingId = msg && msg.correlationId ? msg.correlationId : undefined;
  const correlationId = incomingId ?? cryptoSafeUuid();

  Logger.runWithId(correlationId, () => {
    Logger.info('message.processing.started', { messageId: msg.id ?? 'unknown' });
    // ...existing code for message processing...
    Logger.info('message.processing.finished', { messageId: msg.id ?? 'unknown' });
  });
}

// helper local (puede eliminarse si se importa desde logger)
function cryptoSafeUuid(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

type ModuleInfo = { name: string; version?: string; healthy?: boolean;[k: string]: any };
type Status = {
  status: 'ok' | 'degraded' | 'down';
  uptime?: number;
  timestamp?: string;
  [k: string]: any;
};
type LogEntry = { timestamp: string; level?: string; message: string;[k: string]: any };

function createApp(state: {
  modules: ModuleInfo[];
  logs: LogEntry[];
  startTime: number;
  authService?: AuthService;
}) {
  const app = express();

  // 1) Middleware de correlación
  app.use(Logger.expressCorrelationMiddleware());

  // 2) Security headers
  app.use(securityHeaders);

  // 3) Parsers
  app.use(express.json());

  // 4) Autenticación
  if (state.authService) {
    app.use(createAuthMiddleware(state.authService));
  }

  // Rutas API

  // GET /api/status - PÚBLICA
  app.get('/api/status', (_req, res) => {
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    const payload: Status = { status: 'ok', uptime, timestamp: new Date().toISOString() };
    state.logs.push({ timestamp: payload.timestamp || '', level: 'info', message: 'status.request' });
    res.json(payload);
  });

  // GET /api/modules - PÚBLICA
  app.get('/api/modules', (_req, res) => {
    res.json(state.modules);
  });

  // POST /api/auth/token - GENERACIÓN (con rate limiting)
  app.post('/api/auth/token', rateLimitTokenGeneration, (req, res) => {
    if (!state.authService) {
      res.status(503).json({ error: 'Auth no disponible' });
      return;
    }
    const { agentId, scope, role } = req.body ?? {};
    if (!agentId || !scope || !Array.isArray(scope)) {
      res.status(400).json({ error: 'agentId y scope (array) requeridos' });
      return;
    }
    try {
      const token = state.authService.generateToken(agentId, scope, role);
      res.json({ token, expiresIn: '24h' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/auth/revoke - REVOCAR TOKEN (requiere auth)
  app.post('/api/auth/revoke', state.authService ? requireAuth : [], (req: any, res: any) => {
    if (!state.authService) {
      res.status(503).json({ error: 'Auth no disponible' });
      return;
    }
    const { token } = req.body ?? {};
    if (!token) {
      res.status(400).json({ error: 'token requerido' });
      return;
    }
    try {
      state.authService.revokeToken(token);
      res.json({ ok: true, message: 'Token revocado' });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /api/logs - PROTEGIDA (scope 'logs')
  app.get(
    '/api/logs',
    state.authService ? requireScope(state.authService, 'logs') : [],
    (req: any, res: any) => {
      const since = req.query.since as string | undefined;
      let out = state.logs;
      if (since) {
        out = out.filter((l) => l.timestamp > since);
      }
      res.json(out);
    }
  );

  // POST /api/events - PROTEGIDA (scope 'events')
  app.post(
    '/api/events',
    state.authService ? requireScope(state.authService, 'events') : [],
    (req: any, res: any) => {
      const { event, payload } = req.body ?? {};
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `event.${event}`,
        payload,
      };
      state.logs.push(entry);
      res.json({ ok: true });
    }
  );

  // GET /api/metrics - Métricas globales
  app.get('/api/metrics', (_req, res) => {
    const metrics = metricsCollector.getGlobalMetrics();
    res.json(metrics);
  });

  // GET /api/metrics/agents - Todos los agentes
  app.get('/api/metrics/agents', (_req, res) => {
    const agentStats = metricsCollector.getAllAgentStats();
    res.json(agentStats);
  });

  // GET /api/metrics/agents/:name - Agente específico
  app.get('/api/metrics/agents/:name', (req, res) => {
    const stats = metricsCollector.getAgentStats(req.params.name);
    if (!stats) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(stats);
  });

  // GET /api/metrics/alerts - Alertas
  app.get('/api/metrics/alerts', (req, res) => {
    const since = req.query.since ? Number(req.query.since) : undefined;
    const alerts = metricsCollector.getAlerts(since);
    res.json(alerts);
  });

  // GET /api/metrics/export - Exportar métricas completas
  app.get('/api/metrics/export', (_req, res) => {
    const exported = metricsCollector.exportMetrics();
    res.json(exported);
  });

  // Registrar ruta MCP
  app.use('/api/mcp', mcpRouter);
  // Registrar ruta de configuración
  app.use('/api/config', configRouter);

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

  return app;
}

/**
 * startServer: arrancar HTTP + WebSocket con autenticación opcional.
 */
export async function startServer(opts?: {
  port?: number;
  enableWs?: boolean;
  initialModules?: ModuleInfo[];
}) {
  const port = opts?.port ?? 0;
  const enableWs = opts?.enableWs ?? true;
  const state = {
    modules: opts?.initialModules ?? [{ name: 'orchestrator', version: '0.1.0', healthy: true }],
    logs: [] as LogEntry[],
    startTime: Date.now(),
    authService: undefined as AuthService | undefined,
  };

  // Intentar inicializar AuthService
  try {
    state.authService = new AuthService();
  } catch (err) {
    Logger.warn('mcpServer.auth_init_failed', { error: (err as Error).message });
  }

  const app = createApp(state);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', () => resolve()));

  let wss: WebSocketServer | null = null;
  if (enableWs) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws: WebSocket) => {
      Logger.info('mcpServer.ws.connection');
      // enviar estado inicial
      const status: Status = {
        status: 'ok',
        uptime: Math.floor((Date.now() - state.startTime) / 1000),
        timestamp: new Date().toISOString(),
      };
      try {
        ws.send(JSON.stringify({ event: 'status', payload: status }));
        ws.send(JSON.stringify({ event: 'modules', payload: state.modules }));
      } catch (err) {
        Logger.warn('mcpServer.ws.send_failed', { err });
      }

      ws.on('message', (raw) => {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString());
          if (data.event === 'ping') {
            ws.send(JSON.stringify({ event: 'pong', payload: {} }));
          } else if (data.event === 'log') {
            const entry: LogEntry = {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: data.payload?.message ?? 'client.log',
              ...data.payload,
            };
            state.logs.push(entry);
          }
        } catch (err) {
          Logger.debug('mcpServer.ws.message_parse_error', { err });
        }
      });
    });
  }

  function broadcast(event: string, payload: any) {
    const msg = JSON.stringify({ event, payload });
    if (wss) {
      for (const c of Array.from(wss.clients)) {
        try {
          if (c.readyState === c.OPEN) {
            c.send(msg);
          }
        } catch {
          // ignore
        }
      }
    }
    state.logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `broadcast.${event}`,
      payload,
    });
  }

  return {
    server,
    wss,
    port: (server.address() as any).port,
    broadcast,
    state,
    close: async () =>
      new Promise<void>((resolve) => {
        if (wss) {
          wss.close(() => server.close(() => resolve()));
        } else {
          server.close(() => resolve());
        }
      }),
  };
}
