import type { Request, Response, NextFunction } from 'express';
import { AuthService, AuthToken } from './auth.js';
import { Logger } from './logger.js';
import jwt from 'jsonwebtoken';

// Extender Express Request para incluir token autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthToken;
      authError?: string;
    }
  }
}

/**
 * Middleware que intenta extraer y verificar token JWT del header Authorization.
 * Si es válido, adjunta el payload a req.auth; si falla, adjunta req.authError.
 */
export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      Logger.warn('auth.middleware.invalid_header', { path: req.path });
      req.authError = 'Formato Authorization inválido. Use: Bearer <token>';
      next();
      return;
    }

    try {
      const token = authHeader.slice(7);

      // Verificar si el agente está siendo rate-limitado
      const decoded = jwt.decode(token) as AuthToken;
      if (decoded?.agentId && authService.isBlocked(decoded.agentId)) {
        Logger.warn('auth.middleware.rate_limited', { agentId: decoded.agentId, path: req.path });
        res.status(429).json({ error: 'Demasiados intentos fallidos. Intente más tarde.' });
        return;
      }

      const verified = authService.verifyToken(token);
      req.auth = verified;
      Logger.debug('auth.middleware.verified', { agentId: verified.agentId, path: req.path });
    } catch (err) {
      Logger.warn('auth.middleware.verify_failed', {
        error: (err as Error).message,
        path: req.path,
      });
      req.authError = (err as Error).message;
    }

    next();
  };
}

/**
 * Middleware factory que requiere autenticación válida.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    Logger.warn('auth.requireAuth.missing', { path: req.path, error: req.authError });
    res
      .status(401)
      .json({ error: 'Autenticación requerida', detail: req.authError ?? 'No token provided' });
    return;
  }
  next();
}

/**
 * Middleware factory que requiere un scope/herramienta específico.
 */
export function requireScope(authService: AuthService, scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      Logger.warn('auth.requireScope.missing_auth', { scope, path: req.path });
      res.status(401).json({ error: 'Autenticación requerida' });
      return;
    }

    if (!authService.canAccess(req.auth, scope)) {
      Logger.warn('auth.requireScope.forbidden', {
        agentId: req.auth.agentId,
        scope,
        path: req.path,
      });
      res.status(403).json({ error: 'Acceso denegado', scope });
      return;
    }

    next();
  };
}

/**
 * Middleware factory que requiere un rol específico.
 */
export function requireRole(authService: AuthService, role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      Logger.warn('auth.requireRole.missing_auth', { role, path: req.path });
      res.status(401).json({ error: 'Autenticación requerida' });
      return;
    }

    if (!authService.hasRole(req.auth, role)) {
      Logger.warn('auth.requireRole.forbidden', {
        agentId: req.auth.agentId,
        role,
        path: req.path,
      });
      res
        .status(403)
        .json({ error: 'Acceso denegado', requiredRole: role, userRole: req.auth.role });
      return;
    }

    next();
  };
}

/**
 * Middleware para rate limiting en generación de tokens (prevenir ataques de fuerza bruta).
 * Usa IP del cliente como clave.
 */
const tokenRequestAttempts: Map<string, { count: number; timestamp: number }> = new Map();
const MAX_TOKEN_REQUESTS_PER_MINUTE = 10;

export function rateLimitTokenGeneration(req: Request, res: Response, next: NextFunction) {
  const clientIp = req.ip ?? 'unknown';
  const now = Date.now();
  const record = tokenRequestAttempts.get(clientIp);

  if (!record) {
    tokenRequestAttempts.set(clientIp, { count: 1, timestamp: now });
    next();
    return;
  }

  const elapsed = now - record.timestamp;
  if (elapsed > 60_000) {
    // Resetear cada minuto
    tokenRequestAttempts.set(clientIp, { count: 1, timestamp: now });
    next();
    return;
  }

  record.count += 1;
  if (record.count > MAX_TOKEN_REQUESTS_PER_MINUTE) {
    Logger.warn('auth.rate_limit.token_generation', { clientIp, count: record.count });
    res.status(429).json({ error: 'Demasiados intentos. Intente más tarde.' });
    return;
  }

  next();
}

/**
 * Middleware para añadir headers de seguridad (HSTS, etc.).
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // HSTS solo en HTTPS
  if (process.env.NODE_ENV === 'production' && req.protocol === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

