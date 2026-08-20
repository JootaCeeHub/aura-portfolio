/* eslint-disable @typescript-eslint/no-var-requires */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { startServer } from '../../core-aura-mcp/src/mcpServer';
import { McpCoreClient } from '../../core-aura-mcp/ui/src/services/mcpCoreClient';
import { injectPrompt, AgentEvents } from '../../core-aura-mcp/src/AgentPromptInjector';
import { Logger } from '../../core-aura-mcp/src/lib/logger';
import { TokenManager } from '../../core-aura-mcp/src/lib/authTokens';
import { validate, Schemas } from '../../core-aura-mcp/src/lib/validation';
import { rateLimiters } from '../../core-aura-mcp/src/lib/rateLimiter';
import { auditLogger } from '../../core-aura-mcp/src/lib/auditLog';

function wsFactoryForNode(url: string) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Ws = require('ws');
	const raw = new Ws(url);
	const wrapper: any = {
		_raw: raw,
		addEventListener: (ev: string, cb: any) => {
			if (ev === 'message') raw.on('message', (data: any) => cb({ data: data.toString() }));
			else raw.on(ev, cb);
		},
		removeEventListener: (ev: string, cb: any) => {
			if (ev === 'message') raw.off('message', (data: any) => cb({ data: data.toString() }));
			else raw.off(ev, cb);
		},
		send: (d: any) => raw.send(d),
		close: () => raw.close(),
		get readyState() {
			return raw.readyState;
		}
	};
	return wrapper as unknown as WebSocket;
}

describe('McpCoreClient Integration - Security & Robustness', () => {
	let serv: any;

	beforeAll(async () => {
		serv = await startServer({
			port: 0,
			enableWs: true,
			initialModules: [{ name: 'modA', version: '1.0', healthy: true }]
		});
	});

	afterAll(async () => {
		await serv.close();
	});

	describe('WS Connection & Reconnection', () => {
		it('conecta via WS y recibe eventos', async () => {
			const client = new McpCoreClient(`http://127.0.0.1:${serv.port}`, {
				webSocketFactory: wsFactoryForNode,
				reconnectInitialDelayMs: 50
			});
			let statusReceived = false;
			let modulesReceived = false;

			client.subscribe('status', () => (statusReceived = true));
			client.subscribe('modules', () => (modulesReceived = true));

			await client.connect();
			await new Promise((r) => setTimeout(r, 200));
			expect(statusReceived).toBe(true);
			expect(modulesReceived).toBe(true);
			client.disconnect();
		});

		it('reconecta tras cierre de WS con exponential backoff', async () => {
			const client = new McpCoreClient(`http://127.0.0.1:${serv.port}`, {
				webSocketFactory: wsFactoryForNode,
				reconnectInitialDelayMs: 50,
				reconnectMaxDelayMs: 200
			});
			let reconnectAttempts = 0;

			client.subscribe('status', () => reconnectAttempts++);

			await client.connect();
			await new Promise((r) => setTimeout(r, 150));

			// Simular cierre de WS
			if (serv.wss) serv.wss.clients.forEach((c: any) => c.close());

			await new Promise((r) => setTimeout(r, 300));

			// Recrear WS
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { WebSocketServer } = require('ws');
			serv.wss = new WebSocketServer({ server: serv.server, path: '/ws' });
			serv.wss.on('connection', (ws: any) => {
				ws.send(JSON.stringify({
					event: 'status',
					payload: { status: 'ok', uptime: 9999, timestamp: new Date().toISOString() }
				}));
			});

			await new Promise((r) => setTimeout(r, 500));
			expect(reconnectAttempts).toBeGreaterThan(1);

			client.disconnect();
		});

		it('fallback a polling si WS no disponible', async () => {
			const servNoWs = await startServer({ port: 0, enableWs: false });
			try {
				const client = new McpCoreClient(`http://127.0.0.1:${servNoWs.port}`, {
					webSocketFactory: wsFactoryForNode,
					pollingIntervalMs: 150,
					fetchTimeoutMs: 1000
				});
				let polled = false;

				client.subscribe('status', () => (polled = true));

				await client.connect().catch(() => {});
				await new Promise((r) => setTimeout(r, 400));
				expect(polled).toBe(true);
				client.disconnect();
			} finally {
				await servNoWs.close();
			}
		});
	});

	describe('Security - JWT & Auth', () => {
		it('valida token JWT con estructura correcta', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			const { token } = manager.generateAccessToken('agent1', ['read', 'write']);
			const decoded = manager.verifyAccessToken(token);

			expect(decoded.agentId).toBe('agent1');
			expect(decoded.scope).toContain('read');
			expect(decoded.type).toBe('access');
		});

		it('rechaza token vencido o inválido', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

			expect(() => manager.verifyAccessToken(invalidToken)).toThrow();
		});

		it('refresh token rota correctamente', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			const { token: refreshToken } = manager.generateRefreshToken('agent1');
			const { accessToken, refreshToken: newRefresh } = manager.refreshAccessToken(refreshToken);

			expect(accessToken).toBeDefined();
			expect(newRefresh).toBeDefined();
			expect(accessToken).not.toBe(refreshToken);
		});

		it('detecta token reuse attack', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			const { token: refreshToken } = manager.generateRefreshToken('agent1');
			manager.refreshAccessToken(refreshToken); // First use OK

			// Intentar reusar mismo refresh token
			expect(() => manager.refreshAccessToken(refreshToken)).toThrow('Token reuse detected');
		});
	});

	describe('Security - Input Validation (Zod)', () => {
		it('valida agent execution input correctamente', () => {
			const validInput = { agentId: 'agent1', input: 'test input' };
			const result = validate(Schemas.agentExecutionInput, validInput);

			expect(result.agentId).toBe('agent1');
			expect(result.input).toBe('test input');
		});

		it('rechaza input inválido (agentId vacío)', () => {
			const invalidInput = { agentId: '', input: 'test' };

			expect(() => validate(Schemas.agentExecutionInput, invalidInput)).toThrow();
		});

		it('rechaza payload demasiado grande (DoS prevention)', () => {
			const hugeInput = { agentId: 'agent1', input: 'x'.repeat(20000) };

			expect(() => validate(Schemas.agentExecutionInput, hugeInput)).toThrow();
		});

		it('valida query params con límites', () => {
			const validParams = { limit: 100, offset: 0, filter: 'active' };
			const result = validate(Schemas.queryParams, validParams);

			expect(result.limit).toBe(100);
		});

		it('rechaza query params fuera de rango', () => {
			const invalidParams = { limit: 50000, offset: 0 }; // limit > max

			expect(() => validate(Schemas.queryParams, invalidParams)).toThrow();
		});
	});

	describe('Security - Rate Limiting', () => {
		it('limita requests por IP', () => {
			rateLimiters.perIp.reset('192.168.1.1');

			const results = [];
			for (let i = 0; i < 15; i++) {
				results.push(rateLimiters.perIp.isAllowed('192.168.1.1'));
			}

			const allowed = results.filter((r) => r.allowed).length;
			expect(allowed).toBeGreaterThan(0);
			expect(allowed).toBeLessThan(15);
		});

		it('bloquea after max failed auth attempts', () => {
			rateLimiters.auth.reset('agent1');

			for (let i = 0; i < 12; i++) {
				rateLimiters.auth.isAllowed('agent1');
			}

			const result = rateLimiters.auth.isAllowed('agent1');
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeGreaterThan(0);
		});

		it('retorna retry-after header en bloqueo', () => {
			rateLimiters.global.reset('test-key');

			// Llenar límite
			for (let i = 0; i < 10001; i++) {
				const res = rateLimiters.global.isAllowed('test-key');
				if (!res.allowed) {
					expect(res.retryAfter).toBeDefined();
					expect(res.retryAfter).toBeGreaterThan(0);
					break;
				}
			}
		});
	});

	describe('Security - Audit Logging', () => {
		it('registra acción de auditoría', async () => {
			const testAction = {
				agentId: 'test-agent',
				action: 'execute',
				resource: 'task:123',
				result: 'success' as const,
				metadata: { input: 'test' },
				ipAddress: '127.0.0.1',
				userAgent: 'Test/1.0',
				correlationId: 'trace-123'
			};

			await auditLogger.logAction(testAction);

			const logs = await auditLogger.getLogs({ agentId: 'test-agent' });
			expect(logs.length).toBeGreaterThan(0);
		});

		it('filtra logs por acción', async () => {
			await auditLogger.logAction({
				agentId: 'agent1',
				action: 'login',
				resource: 'session',
				result: 'success',
				metadata: {},
				ipAddress: '127.0.0.1',
				userAgent: 'Test'
			});

			const logs = await auditLogger.getLogs({ action: 'login' });
			expect(logs.length).toBeGreaterThan(0);
		});

		it('exporta logs para auditoría externa (SOC 2)', async () => {
			const startTime = Date.now() - 10000;
			const endTime = Date.now();

			const csv = await auditLogger.exportForAudit(startTime, endTime);

			expect(csv).toBeInstanceOf(Buffer);
			expect(csv.toString()).toContain('Timestamp');
			expect(csv.toString()).toContain('Agent');
		});
	});

	describe('Prompt Injection with Security Context', () => {
		it('incluye correlationId cuando se ejecuta dentro de Logger.runWithId', async () => {
			const received: any[] = [];
			const unsub = (payload: any) => received.push(payload);
			AgentEvents.on('agent:promptInjected', unsub);

			const testCid = 'test-cid-1234';
			Logger.runWithId(testCid, async () => {
				await injectPrompt('agentX', 'hello world');
			});

			await new Promise((r) => setTimeout(r, 20));

			expect(received.length).toBeGreaterThan(0);
			expect(received[0].agentId).toBe('agentX');
			expect(received[0].correlationId).toBe(testCid);

			AgentEvents.off('agent:promptInjected', unsub);
		});

		it('valida prompt input antes de inyección', async () => {
			const validPrompt = 'Safe prompt content';
			const result = validate(Schemas.agentExecutionInput, {
				agentId: 'agent1',
				input: validPrompt
			});

			expect(result.input).toBe(validPrompt);
		});

		it('rechaza prompt input malicioso', () => {
			const maliciousPayload = {
				agentId: 'agent1',
				input: '<script>alert("xss")</script>' + 'x'.repeat(10000) // XSS + DoS
			};

			expect(() => validate(Schemas.agentExecutionInput, maliciousPayload)).toThrow();
		});
	});

	describe('End-to-End Security Flow', () => {
		it('ejecuta flujo seguro: auth -> validation -> rate-limit -> audit', async () => {
			// 1. Generar token
			const tokenMgr = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);
			const { token } = tokenMgr.generateAccessToken('agent1', ['execute']);

			// 2. Verificar token
			const decoded = tokenMgr.verifyAccessToken(token);
			expect(decoded.agentId).toBe('agent1');

			// 3. Validar input
			const input = { agentId: 'agent1', input: 'safe input' };
			const validated = validate(Schemas.agentExecutionInput, input);
			expect(validated).toBeDefined();

			// 4. Verificar rate limit
			const ipLimit = rateLimiters.perIp.isAllowed('127.0.0.1');
			expect(ipLimit.allowed).toBe(true);

			// 5. Registrar en audit log
			await auditLogger.logAction({
				agentId: 'agent1',
				action: 'execute',
				resource: validated.agentId,
				result: 'success',
				metadata: { decoded },
				ipAddress: '127.0.0.1',
				userAgent: 'E2E-Test',
				correlationId: 'e2e-trace-' + Date.now()
			});

			const logs = await auditLogger.getLogs({ agentId: 'agent1' });
			expect(logs.length).toBeGreaterThan(0);
		});
	});
});
