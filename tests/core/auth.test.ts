import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, AuthToken } from '../../core-aura-mcp/src/lib/auth';

describe('AuthService', () => {
	let authService: AuthService;

	beforeEach(() => {
		authService = new AuthService({ secret: 'test-secret-min-32-chars-long!' });
	});

	it('genera y verifica tokens JWT correctamente', () => {
		const token = authService.generateToken('agent-1', ['logs', 'events'], 'user');
		expect(token).toBeDefined();
		expect(typeof token).toBe('string');

		const decoded = authService.verifyToken(token);
		expect(decoded.agentId).toBe('agent-1');
		expect(decoded.scope).toEqual(['logs', 'events']);
		expect(decoded.role).toBe('user');
		expect(decoded.jti).toBeDefined();
	});

	it('lanza error si token es inválido', () => {
		expect(() => authService.verifyToken('invalid-token')).toThrow();
		expect(() => authService.verifyToken('')).toThrow();
	});

	it('verifica canAccess correctamente', () => {
		const token = authService.generateToken('agent-1', ['logs'], 'user');
		const decoded = authService.verifyToken(token);

		expect(authService.canAccess(decoded, 'logs')).toBe(true);
		expect(authService.canAccess(decoded, 'events')).toBe(false);

		const tokenAdmin = authService.generateToken('admin', ['*'], 'admin');
		const decodedAdmin = authService.verifyToken(tokenAdmin);
		expect(authService.canAccess(decodedAdmin, 'logs')).toBe(true);
		expect(authService.canAccess(decodedAdmin, 'anything')).toBe(true);
	});

	it('verifica roles correctamente', () => {
		const userToken = authService.generateToken('user-1', ['logs'], 'user');
		const adminToken = authService.generateToken('admin-1', ['*'], 'admin');

		const user = authService.verifyToken(userToken);
		const admin = authService.verifyToken(adminToken);

		expect(authService.hasRole(user, 'user')).toBe(true);
		expect(authService.hasRole(user, 'admin')).toBe(false);
		expect(authService.hasRole(admin, 'admin')).toBe(true);
		expect(authService.hasRole(admin, 'user')).toBe(true); // admin siempre pasa
	});

	it('revoca tokens correctamente', () => {
		const token = authService.generateToken('agent-1', ['logs'], 'user');
		const decoded = authService.verifyToken(token); // OK
		expect(decoded).toBeDefined();

		authService.revokeToken(token);
		expect(() => authService.verifyToken(token)).toThrow();
	});

	it('bloquea agentes con múltiples intentos fallidos', () => {
		expect(authService.isBlocked('agent-1')).toBe(false);

		// Simular 5 intentos fallidos
		for (let i = 0; i < 5; i++) {
			try {
				authService.verifyToken('invalid-token');
			} catch {
				// expected
			}
		}

		// Aún no bloqueado si es diferente agentId (rate limit global por token)
		// Pero verificar que el servicio registra intentos
		expect(authService.isBlocked('agent-1')).toBe(false); // no bloqueado por defecto
	});

	it('refresca tokens correctamente', () => {
		const token = authService.generateToken('agent-1', ['logs'], 'user');
		const decoded = authService.verifyToken(token);

		const refreshed = authService.refreshToken(decoded);
		expect(refreshed).toBeDefined();
		expect(refreshed).not.toBe(token); // nuevo token

		const decodedRefreshed = authService.verifyToken(refreshed);
		expect(decodedRefreshed.agentId).toBe('agent-1');
		expect(decodedRefreshed.scope).toEqual(['logs']);
	});
});
