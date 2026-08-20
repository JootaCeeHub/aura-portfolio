import express, { Express } from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { eventBus } from '../../core-aura-mcp/src/lib/eventBus';
import { Logger } from '../../core-aura-mcp/src/lib/logger';

/**
 * Devtools browser para inspección de agentes en tiempo real.
 */
export class AuraDevtools {
	private app: Express;

	private server: http.Server;

	private wss: WebSocketServer;

	private port: number;

	constructor(port: number = 9999) {
		this.port = port;
		this.app = express();
		this.server = http.createServer(this.app);
		this.wss = new WebSocketServer({ server: this.server });

		this.setupRoutes();
		this.setupWebSocket();
	}

	/**
	 * Iniciar devtools.
	 */
	async start(): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(this.port, () => {
				Logger.info('devtools.started', { port: this.port, url: `http://localhost:${this.port}` });
				resolve();
			});
		});
	}

	/**
	 * Detener devtools.
	 */
	async stop(): Promise<void> {
		this.wss.close();
		return new Promise((resolve) => {
			this.server.close(() => resolve());
		});
	}

	/**
	 * Setup de rutas HTTP.
	 */
	private setupRoutes(): void {
		// Servir UI
		this.app.use(express.static('packages/devtools/public'));

		// API: eventos recientes
		this.app.get('/api/events', (_req, res) => {
			const events = eventBus.getEventLog().slice(-50);
			res.json(events);
		});

		// API: agentes
		this.app.get('/api/agents', (_req, res) => {
			// Obtener desde agentFactory o metricsCollector
			res.json([
				{ id: 'agent1', name: 'Agent 1', status: 'healthy' },
				{ id: 'agent2', name: 'Agent 2', status: 'executing' },
			]);
		});

		// API: logs
		this.app.get('/api/logs', (req, res) => {
			const limit = Number(req.query.limit ?? 100);
			const level = req.query.level as string | undefined;

			const allLogs = Logger.getMemoryLogs();
			const filtered = level ? allLogs.filter((l) => (l as any).level === level) : allLogs;

			res.json(filtered.slice(-limit));
		});

		// API: métricas
		this.app.get('/api/metrics', (_req, res) => {
			// Obtener desde metricsCollector
			res.json({
				totalExecutions: 42,
				activeAgents: 3,
				errorRate: 0.02,
			});
		});
	}

	/**
	 * Setup de WebSocket para eventos en tiempo real.
	 */
	private setupWebSocket(): void {
		this.wss.on('connection', (ws) => {
			Logger.debug('devtools.ws.connection');

			// Suscribirse a eventos
			const unsubEvent = eventBus.subscribe('AgentExecutionCompleted', (event) => {
				ws.send(JSON.stringify({ type: 'event', data: event }));
			});

			const unsubLog = Logger.onLog?.((log) => {
				ws.send(JSON.stringify({ type: 'log', data: log }));
			});

			ws.on('close', () => {
				unsubEvent();
				unsubLog?.();
				Logger.debug('devtools.ws.disconnected');
			});
		});
	}
}

export const devtools = new AuraDevtools();
