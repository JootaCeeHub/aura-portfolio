import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../core-aura-mcp/src/lib/auth';

describe('AuthService - Extended Cases', () => {
	let authService: AuthService;

	beforeEach(() => {
		authService = new AuthService({ secret: 'test-secret-min-32-chars-long!' });
	});

	describe('generateToken edge cases', () => {
		it('genera token con scope vacío', () => {
			const token = authService.generateToken('agent', [], 'user');
			const decoded = authService.verifyToken(token);
			expect(decoded.scope).toEqual([]);
		});

		it('genera token con agentId vacío', () => {
			const token = authService.generateToken('', ['logs'], 'user');
			const decoded = authService.verifyToken(token);
			expect(decoded.agentId).toBe('');
		});

		it('genera token con scope especial (caracteres)', () => {
			const scopes = ['logs:read', 'logs:write', 'agents/*'];
			const token = authService.generateToken('agent', scopes, 'admin');
			const decoded = authService.verifyToken(token);
			expect(decoded.scope).toEqual(scopes);
		});

		it('genera token con role no-estándar', () => {
			const token = authService.generateToken('agent', ['*'], 'custom-role');
			const decoded = authService.verifyToken(token);
			expect(decoded.role).toBe('custom-role');
		});

		it('genera token con role null (usa default user)', () => {
			const token = authService.generateToken('agent', ['logs'], null as any);
			const decoded = authService.verifyToken(token);
			expect(decoded.role).toBe('user');
		});
	});

	describe('verifyToken edge cases', () => {
		it('lanza error con token completamente inválido', () => {
			expect(() => authService.verifyToken('not.a.token')).toThrow();
		});

		it('lanza error con token vacío', () => {
			expect(() => authService.verifyToken('')).toThrow();
		});

		it('lanza error con null', () => {
			expect(() => authService.verifyToken(null as any)).toThrow();
		});

		it('lanza error con undefined', () => {
			expect(() => authService.verifyToken(undefined as any)).toThrow();
		});

		it('lanza error si se verifica con secreto diferente', () => {
			const token = authService.generateToken('agent', ['logs'], 'user');
			const wrongService = new AuthService({ secret: 'different-secret-min-32-chars!!' });
			expect(() => wrongService.verifyToken(token)).toThrow();
		});
	});

	describe('canAccess edge cases', () => {
		it('retorna true si scope contiene wildcard al principio', () => {
			const token = authService.generateToken('agent', ['*', 'logs'], 'user');
			const decoded = authService.verifyToken(token);
			expect(authService.canAccess(decoded, 'anything')).toBe(true);
		});

		it('retorna false si scope es vacío', () => {
			const token = authService.generateToken('agent', [], 'user');
			const decoded = authService.verifyToken(token);
			expect(authService.canAccess(decoded, 'logs')).toBe(false);
		});

		it('es case-sensitive en nombres de herramientas', () => {
			const token = authService.generateToken('agent', ['Logs'], 'user');
			const decoded = authService.verifyToken(token);
			expect(authService.canAccess(decoded, 'logs')).toBe(false);
			expect(authService.canAccess(decoded, 'Logs')).toBe(true);
		});

		it('maneja herramientas con caracteres especiales', () => {
			const token = authService.generateToken('agent', ['logs:read', 'agents/*'], 'user');
			const decoded = authService.verifyToken(token);
			expect(authService.canAccess(decoded, 'logs:read')).toBe(true);
			expect(authService.canAccess(decoded, 'agents/*')).toBe(true);
			expect(authService.canAccess(decoded, 'agents/list')).toBe(false);
		});
	});

	describe('hasRole edge cases', () => {
		it('admin role siempre retorna true para cualquier rol buscado', () => {
			const token = authService.generateToken('admin', ['*'], 'admin');
			const decoded = authService.verifyToken(token);

			expect(authService.hasRole(decoded, 'admin')).toBe(true);
			expect(authService.hasRole(decoded, 'user')).toBe(true);
			expect(authService.hasRole(decoded, 'viewer')).toBe(true);
			expect(authService.hasRole(decoded, 'any-role')).toBe(true);
		});

		it('non-admin roles solo retornan true para su propio rol', () => {
			const token = authService.generateToken('user', ['logs'], 'viewer');
			const decoded = authService.verifyToken(token);

			expect(authService.hasRole(decoded, 'viewer')).toBe(true);
			expect(authService.hasRole(decoded, 'user')).toBe(false);
			expect(authService.hasRole(decoded, 'admin')).toBe(false);
		});

		it('maneja comparación con role vacío', () => {
			const token = authService.generateToken('agent', ['logs'], 'user');
			const decoded = authService.verifyToken(token);
			expect(authService.hasRole(decoded, '')).toBe(false);
		});
	});

	describe('revokeToken edge cases', () => {
		it('no lanza error si se revoca un token inválido', () => {
			expect(() => authService.revokeToken('invalid-token')).not.toThrow();
		});

		it('no lanza error si se revoca dos veces', () => {
			const token = authService.generateToken('agent', ['logs'], 'user');
			authService.revokeToken(token);
			expect(() => authService.revokeToken(token)).not.toThrow();
		});
	});

	describe('isBlocked edge cases', () => {
		it('retorna false para agentId desconocido', () => {
			expect(authService.isBlocked('unknown-agent')).toBe(false);
		});

		it('retorna false si ningún intento fallido registrado', () => {
			expect(authService.isBlocked('agent-never-tried')).toBe(false);
		});
	});

	describe('hasAnyRole edge cases', () => {
		it('retorna true si uno de los roles coincide', () => {
			const token = authService.generateToken('user', ['logs'], 'user');
			const decoded = authService.verifyToken(token);

			expect(authService.hasAnyRole(decoded, ['viewer', 'user', 'admin'])).toBe(true);
		});

		it('retorna false si ninguno coincide', () => {
			const token = authService.generateToken('user', ['logs'], 'user');
			const decoded = authService.verifyToken(token);

			expect(authService.hasAnyRole(decoded, ['admin', 'moderator'])).toBe(false);
		});

		it('admin siempre retorna true', () => {
			const token = authService.generateToken('admin', ['*'], 'admin');
			const decoded = authService.verifyToken(token);

			expect(authService.hasAnyRole(decoded, ['viewer'])).toBe(true);
		});

		it('maneja array vacío de roles', () => {
			const token = authService.generateToken('user', ['logs'], 'user');
			const decoded = authService.verifyToken(token);

			expect(authService.hasAnyRole(decoded, [])).toBe(false);
		});
	});
});
