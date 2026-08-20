import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Logger } from './logger.js';

export interface AccessToken {
	agentId: string;
	scope: string[];
	role: string;
	type: 'access';
	iat: number;
	exp: number;
	jti: string;
}

export interface RefreshToken {
	agentId: string;
	type: 'refresh';
	iat: number;
	exp: number;
	jti: string;
	tokenFamily: string; // Detectar token reuse attack
}

/**
 * Token manager con access + refresh tokens.
 * Cumple con JWT best practices:
 * - Access tokens: short-lived (15 min)
 * - Refresh tokens: long-lived (7 days), rotatable
 * - Token family para detectar reuse attacks
 */
export class TokenManager {
	private secret: string;

	private refreshSecret: string;

	private tokenFamily: Map<string, string> = new Map(); // jti -> family

	private revokedTokens: Set<string> = new Set();

	constructor(secret: string, refreshSecret: string) {
		this.secret = secret;
		this.refreshSecret = refreshSecret;

		if (secret.length < 32) {
			throw new Error('Secret must be at least 32 characters');
		}
	}

	/**
	 * Generar access token (corta duración).
	 */
	generateAccessToken(agentId: string, scope: string[], role: string = 'user'): { token: string; expiresIn: string } {
		const jti = randomBytes(16).toString('hex');
		const family = randomBytes(16).toString('hex');
		this.tokenFamily.set(jti, family);

		const token = jwt.sign(
			{
				agentId,
				scope,
				role,
				type: 'access',
				jti,
			} as AccessToken,
			this.secret,
			{
				expiresIn: '15m',
				issuer: 'aura-mcp',
				subject: agentId,
			}
		);

		Logger.debug('authTokens.accessToken.generated', { agentId, jti });

		return { token, expiresIn: '15m' };
	}

	/**
	 * Generar refresh token (larga duración, rotatable).
	 */
	generateRefreshToken(agentId: string): { token: string; expiresIn: string } {
		const jti = randomBytes(16).toString('hex');
		const family = randomBytes(16).toString('hex');
		this.tokenFamily.set(jti, family);

		const token = jwt.sign(
			{
				agentId,
				type: 'refresh',
				jti,
				tokenFamily: family,
			} as RefreshToken,
			this.refreshSecret,
			{
				expiresIn: '7d',
				issuer: 'aura-mcp',
				subject: agentId,
			}
		);

		Logger.debug('authTokens.refreshToken.generated', { agentId, jti });

		return { token, expiresIn: '7d' };
	}

	/**
	 * Verificar access token.
	 */
	verifyAccessToken(token: string): AccessToken {
		try {
			const decoded = jwt.verify(token, this.secret, {
				issuer: 'aura-mcp',
			}) as AccessToken;

			if (decoded.type !== 'access') {
				throw new Error('Invalid token type');
			}

			if (this.revokedTokens.has(decoded.jti)) {
				throw new Error('Token revoked');
			}

			return decoded;
		} catch (err) {
			Logger.warn('authTokens.accessToken.verify_failed', { error: (err as Error).message });
			throw new Error(`Token verification failed: ${(err as Error).message}`);
		}
	}

	/**
	 * Refrescar access token usando refresh token.
	 */
	refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } {
		try {
			const decoded = jwt.verify(refreshToken, this.refreshSecret, {
				issuer: 'aura-mcp',
			}) as RefreshToken;

			if (decoded.type !== 'refresh') {
				throw new Error('Invalid token type');
			}

			if (this.revokedTokens.has(decoded.jti)) {
				throw new Error('Refresh token revoked');
			}

			// Detectar token reuse attack
			const storedFamily = this.tokenFamily.get(decoded.jti);
			if (storedFamily && storedFamily !== decoded.tokenFamily) {
				Logger.error('authTokens.tokenReuse.detected', { agentId: decoded.agentId });
				this.revokeTokenFamily(decoded.tokenFamily);
				throw new Error('Token reuse detected - family invalidated');
			}

			// Generar nuevos tokens
			const { token: newAccessToken } = this.generateAccessToken(decoded.agentId, [], 'user');
			const { token: newRefreshToken } = this.generateRefreshToken(decoded.agentId);

			// Revocar viejo refresh token
			this.revokedTokens.add(decoded.jti);

			return { accessToken: newAccessToken, refreshToken: newRefreshToken };
		} catch (err) {
			Logger.error('authTokens.refresh_failed', { error: (err as Error).message });
			throw err;
		}
	}

	/**
	 * Revocar token por familia (token reuse attack).
	 */
	private revokeTokenFamily(family: string): void {
		for (const [jti, fam] of this.tokenFamily) {
			if (fam === family) {
				this.revokedTokens.add(jti);
			}
		}
	}

	/**
	 * Revocar token.
	 */
	revokeToken(jti: string): void {
		this.revokedTokens.add(jti);
		Logger.debug('authTokens.token.revoked', { jti });
	}
}

