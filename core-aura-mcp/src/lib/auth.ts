import jwt from 'jsonwebtoken';

import { Logger } from './logger.js';

export interface AuthToken {
  agentId: string;
  scope: string[];
  role?: string;
  iat: number;
  exp?: number;
  jti?: string;
}

export interface AuthOptions {
  secret?: string;
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  minSecretLength?: number;
}

export class AuthService {
  private secret: string;

  private expiresIn: string | number;

  private issuer: string;

  private audience?: string;

  private revokedTokens: Set<string> = new Set();

  private failedAttempts: Map<string, { count: number; timestamp: number }> = new Map();

  private readonly maxFailedAttempts = 5;

  private readonly failureWindowMs = 15 * 60 * 1000;

  constructor(opts?: AuthOptions) {
    this.secret = opts?.secret ?? process.env.JWT_SECRET ?? '';
    const minLen = opts?.minSecretLength ?? 32;

    if (!this.secret) {
      throw new Error('JWT_SECRET no configurado en env o opciones');
    }

    if (this.secret.length < minLen) {
      Logger.warn('auth.weak_secret', { minLength: minLen, actualLength: this.secret.length });
    }

    this.expiresIn = opts?.expiresIn ?? '24h';
    this.issuer = opts?.issuer ?? 'aura-mcp-core';
    this.audience = opts?.audience ?? process.env.JWT_AUDIENCE;
  }

  // Generar token JWT con jti (JWT ID) para auditoría
  generateToken(agentId: string, scope: string[], role?: string): string {
    try {
      const jti = `${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const payload: AuthToken = {
        agentId,
        scope,
        role: role ?? 'user',
        iat: Math.floor(Date.now() / 1000),
        jti,
      };

      const opts: any = {
        expiresIn: this.expiresIn,
        issuer: this.issuer,
        subject: agentId,
        jwtid: jti,
      };

      if (this.audience) opts.audience = this.audience;

      const token = jwt.sign(payload, this.secret, opts);
      Logger.info('auth.token.generated', { agentId, scope, role, jti });
      return token;
    } catch (err) {
      Logger.error('auth.token.generate_failed', { agentId, error: (err as Error).message });
      throw err;
    }
  }

  // Verificar y parsear token JWT con validación de revocación
  verifyToken(token: string): AuthToken {
    try {
      const opts: any = {
        issuer: this.issuer,
      };
      if (this.audience) opts.audience = this.audience;

      const decoded = jwt.verify(token, this.secret, opts) as unknown as AuthToken;

      // Verificar si el token fue revocado
      if (decoded.jti && this.revokedTokens.has(decoded.jti)) {
        Logger.warn('auth.token.revoked', { jti: decoded.jti, agentId: decoded.agentId });
        throw new Error('Token revocado');
      }

      return decoded;
    } catch (err) {
      // registrar intento fallido para rate limiting
      const agentId = (jwt.decode(token) as any)?.agentId ?? 'unknown';
      this.recordFailedAttempt(agentId);
      Logger.warn('auth.token.verify_failed', { error: (err as Error).message, agentId });
      throw new Error(`Token inválido: ${(err as Error).message}`);
    }
  }

  // Revocar un token (por jti)
  revokeToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as AuthToken;
      if (decoded?.jti) {
        this.revokedTokens.add(decoded.jti);
        Logger.info('auth.token.revoked_explicit', { jti: decoded.jti, agentId: decoded.agentId });
      }
    } catch {
      // ignore decode errors
    }
  }

  // Verificar si un agente está siendo bloqueado por rate limiting
  isBlocked(agentId: string): boolean {
    const record = this.failedAttempts.get(agentId);
    if (!record) return false;

    const elapsed = Date.now() - record.timestamp;
    if (elapsed > this.failureWindowMs) {
      this.failedAttempts.delete(agentId);
      return false;
    }

    return record.count >= this.maxFailedAttempts;
  }

  // Registrar intento fallido
  private recordFailedAttempt(agentId: string): void {
    const record = this.failedAttempts.get(agentId);
    if (!record) {
      this.failedAttempts.set(agentId, { count: 1, timestamp: Date.now() });
    } else {
      const elapsed = Date.now() - record.timestamp;
      if (elapsed > this.failureWindowMs) {
        this.failedAttempts.set(agentId, { count: 1, timestamp: Date.now() });
      } else {
        record.count += 1;
        if (record.count >= this.maxFailedAttempts) {
          Logger.warn('auth.rate_limit_exceeded', { agentId, count: record.count });
        }
      }
    }
  }

  // Verificar acceso a herramienta
  canAccess(token: AuthToken, tool: string): boolean {
    if (token.scope.includes('*')) return true;
    return token.scope.includes(tool);
  }

  // Verificar rol
  hasRole(token: AuthToken, role: string): boolean {
    return token.role === role || token.role === 'admin';
  }

  // Verificar múltiples roles
  hasAnyRole(token: AuthToken, roles: string[]): boolean {
    return roles.some((r) => this.hasRole(token, r));
  }

  // Refrescar token (emitir nuevo con mismo payload)
  refreshToken(token: AuthToken): string {
    const { agentId, scope, role } = token;
    return this.generateToken(agentId, scope, role);
  }

  // Limpiar tokens revocados expirados periódicamente (en producción, usar DB)
  cleanupRevoked(): void {
    // const now = Math.floor(Date.now() / 1000);
    const cleaned = this.revokedTokens.size;
    // Simplificado: asumir que después de 24h ya expiró
    // En prod: almacenar exp con jti en DB y limpiar según exp
    Logger.debug('auth.revoked_cleanup', { cleaned });
  }
}

// Exportar tipos para uso en middleware/rutas


