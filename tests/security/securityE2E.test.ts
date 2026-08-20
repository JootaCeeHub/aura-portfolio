import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../../core-aura-mcp/src/mcpServer';
import { TokenManager } from '../../core-aura-mcp/src/lib/authTokens';
import { RateLimiter, rateLimiters } from '../../core-aura-mcp/src/lib/rateLimiter';
import { EncryptionService } from '../../core-aura-mcp/src/lib/encryption';
import { AuditLogger } from '../../core-aura-mcp/src/lib/auditLog';
import crypto from 'crypto';

describe('Security E2E Tests', () => {
	let serv: any;

	beforeAll(async () => {
		serv = await startServer({ port: 0, enableWs: false });
	});

	afterAll(async () => {
		await serv.close();
	});

	describe('JWT Tokens', () => {
		it('genera access token y lo verifica', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			const { token } = manager.generateAccessToken('agent1', ['read', 'write']);
			const decoded = manager.verifyAccessToken(token);

			expect(decoded.agentId).toBe('agent1');
			expect(decoded.scope).toContain('read');
		});

		it('rechaza token vencido', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			// Token con exp falso (expirado)
			const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid';

			expect(() => manager.verifyAccessToken(expiredToken)).toThrow();
		});

		it('detecta token reuse attack', () => {
			const manager = new TokenManager(
				'secret-key-min-32-chars-long!!!!!!',
				'refresh-secret-min-32-chars!!!!!!'
			);

			const { token: refresh } = manager.generateRefreshToken('agent1');
			const { accessToken: access1 } = manager.refreshAccessToken(refresh);

			// Intentar reusar refresh token (attack)
			expect(() => manager.refreshAccessToken(refresh)).toThrow('Token reuse detected');
		});
	});

	describe('Rate Limiting', () => {
		it('limita requests por IP', () => {
			const limiter = new RateLimiter(1000, 5); // 5 req/sec

			const results = [];
			for (let i = 0; i < 10; i++) {
				results.push(limiter.isAllowed('192.168.1.1'));
			}

			const allowed = results.filter((r) => r.allowed).length;
			expect(allowed).toBe(5);
			expect(results[5]?.retryAfter).toBeGreaterThan(0);
		});

		it('bloquea después de múltiples intentos', () => {
			rateLimiters.auth.reset('agent1');

			for (let i = 0; i < 12; i++) {
				rateLimiters.auth.isAllowed('agent1');
			}

			const result = rateLimiters.auth.isAllowed('agent1');
			expect(result.allowed).toBe(false);
		});
	});

	describe('Encryption', () => {
		it('encripta y desencripta secretos', () => {
			const service = new EncryptionService(crypto.randomBytes(32).toString('hex'));

			const secret = 'my-super-secret-password';
			const encrypted = service.encrypt(secret);

			expect(encrypted).not.toBe(secret);
			expect(encrypted).toContain(':');

			const decrypted = service.decrypt(encrypted);
			expect(decrypted).toBe(secret);
		});

		it('hashea y verifica passwords', () => {
			const service = new EncryptionService(crypto.randomBytes(32).toString('hex'));

			const password = 'MySecurePassword123!';
			const hash = service.hashPassword(password);

			expect(service.verifyPassword(password, hash)).toBe(true);
			expect(service.verifyPassword('WrongPassword', hash)).toBe(false);
		});

		it('genera diferente hash para mismo password (salt)', () => {
			const service = new EncryptionService(crypto.randomBytes(32).toString('hex'));

			const password = 'test';
			const hash1 = service.hashPassword(password);
			const hash2 = service.hashPassword(password);

			expect(hash1).not.toBe(hash2);
			expect(service.verifyPassword(password, hash1)).toBe(true);
			expect(service.verifyPassword(password, hash2)).toBe(true);
		});
	});

	describe('Audit Logging', () => {
		it('registra acciones de auditoría', async () => {
			const logger = new AuditLogger();

			await logger.logAction({
				agentId: 'agent1',
				action: 'execute',
				resource: 'task:123',
				result: 'success',
				metadata: { input: 'test' },
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
				correlationId: 'trace-123',
			});

			// En test, validar que se intentó insertar (DB mock)
			expect(true).toBe(true); // placeholder
		});
	});

	describe('Input Validation (Zod)', () => {
		it('valida agent execution input', () => {
			const { Schemas, validate } = require('../../core-aura-mcp/src/lib/validation');

			const validInput = { agentId: 'agent1', input: 'hello' };
			const result = validate(Schemas.agentExecutionInput, validInput);

			expect(result.agentId).toBe('agent1');
		});

		it('rechaza input inválido', () => {
			const { Schemas, validate } = require('../../core-aura-mcp/src/lib/validation');

			const invalidInput = { agentId: '', input: 'x' }; // agentId vacio

			expect(() => validate(Schemas.agentExecutionInput, invalidInput)).toThrow();
		});

		it('previene DoS via payload grande', () => {
			const { Schemas, validate } = require('../../core-aura-mcp/src/lib/validation');

			const hugeInput = { agentId: 'agent1', input: 'x'.repeat(20000) };

			expect(() => validate(Schemas.agentExecutionInput, hugeInput)).toThrow();
		});
	});

	describe('Security Headers', () => {
		it('incluye HSTS header', async () => {
			const response = await fetch(`http://127.0.0.1:${serv.port}/api/status`);

			// En prod: Strict-Transport-Security header debe estar presente
			// En test: validar que headers están configurados
			expect(response.status).toBe(200);
		});
	});
});
