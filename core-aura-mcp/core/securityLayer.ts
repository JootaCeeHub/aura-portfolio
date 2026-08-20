/**
 * securityLayer.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Capa de seguridad y validación profunda del ecosistema AURA-MCP.
 *
 * Basado en:
 *  ✔ Plantilla MCP IA Modular.pdf
 *      - Hardening (CSRF, IP whitelist, metadata)            L6-L15
 *      - Autenticación, JWT, RLS                             L31-L43
 *      - Validación contextual                               L33-L36
 *      - Expiración de resumeURL                             L74-L81
 *
 * Funciones principales:
 *  - Validación de origen y canal
 *  - IP Whitelist
 *  - Validación JWT / RLS
 *  - Validación contextual (usuario, módulo, rol)
 *  - Validación estructural del input
 *  - Validación semántica (según políticas del módulo)
 *  - Validación de resumeURL (TTL + firma)
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Logger } from '../src/lib/logger.js';

// =============================================================================
// 1. Tipos y config
// =============================================================================

export interface SecurityConfig {
  originsAllowed?: string[];
  ipWhitelist?: string[];
  jwtSecret?: string;
  requireJwt?: boolean;
  enableOriginCheck?: boolean;
  enableIpWhitelist?: boolean;
  enableContextValidation?: boolean;
  enableSemanticValidation?: boolean;

  resumeUrlSignatureSecret?: string;
  resumeUrlTtlMinutes?: number;

  // RLS-aware (para Supabase u otras BD)
  rlsFields?: string[];
}

export interface RequestMeta {
  ip?: string;
  origin?: string;
  userAgent?: string;
  headers?: Record<string, any>;
  user?: any; // usuario autenticado
  context?: any; // contexto del módulo
  timestamp?: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  meta?: any;
}

// =============================================================================
// 2. Security Layer principal
// =============================================================================

export class SecurityLayer {
  private static config: SecurityConfig = {
    originsAllowed: ['*'],
    ipWhitelist: [],
    jwtSecret: '',
    requireJwt: false,
    enableOriginCheck: true,
    enableIpWhitelist: false,
    enableContextValidation: true,
    enableSemanticValidation: true,

    resumeUrlSignatureSecret: '',
    resumeUrlTtlMinutes: 60,

    rlsFields: ['user_id', 'rol', 'contexto_modulo'],
  };

  // ---------------------------------------------------------------------------
  // Cargar configuración global
  // ---------------------------------------------------------------------------
  static configure(cfg: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...cfg };
    Logger.info('[SecurityLayer] Configuración cargada', this.config);
  }

  // =============================================================================
  // 3. Validación de origen (anti-CSRF según PDF)
  // =============================================================================
  static checkOrigin(origin?: string): ValidationResult {
    if (!this.config.enableOriginCheck) return { ok: true };

    const allowed = this.config.originsAllowed || [];

    if (allowed.includes('*')) return { ok: true };

    if (!origin) {
      return { ok: false, reason: 'Missing Origin header.' };
    }

    if (!allowed.includes(origin)) {
      return {
        ok: false,
        reason: `Origin not allowed: ${origin}`,
      };
    }

    return { ok: true };
  }

  // =============================================================================
  // 4. Validación IP Whitelist
  // =============================================================================
  static checkIpWhitelist(ip?: string): ValidationResult {
    if (!this.config.enableIpWhitelist) return { ok: true };
    if (!ip) return { ok: false, reason: 'IP no detectada.' };

    const whitelist = this.config.ipWhitelist || [];

    if (whitelist.length === 0) return { ok: true };

    if (!whitelist.includes(ip)) {
      return { ok: false, reason: `IP prohibida: ${ip}` };
    }

    return { ok: true };
  }

  // =============================================================================
  // 5. Validación JWT (Autenticación + claims + RLS)
  // =============================================================================
  static checkJwt(token?: string): ValidationResult {
    const { requireJwt, jwtSecret, rlsFields } = this.config;

    if (!requireJwt) return { ok: true };

    if (!token) {
      return { ok: false, reason: 'JWT requerido pero no recibido.' };
    }

    try {
      const decoded = jwt.verify(token, jwtSecret || '');
      // Validación RLS básica (si el módulo lo requiere)
      if (rlsFields && typeof decoded === 'object') {
        for (const field of rlsFields) {
          if (!(field in decoded)) {
            return {
              ok: false,
              reason: `JWT missing field required for RLS: ${field}`,
            };
          }
        }
      }

      return { ok: true, meta: decoded };
    } catch {
      return { ok: false, reason: 'JWT inválido o expirado.' };
    }
  }

  // =============================================================================
  // 6. Validación contextual (PDF: validación doble contextual)
  // =============================================================================
  static checkContext(meta: RequestMeta): ValidationResult {
    if (!this.config.enableContextValidation) return { ok: true };

    const { user, context } = meta;

    if (!user) {
      return { ok: false, reason: 'Contexto inválido: usuario no autenticado.' };
    }

    if (!context) {
      return { ok: false, reason: 'Contexto inválido: falta contexto del módulo.' };
    }

    // Ejemplo: validar que user.context_id == context.context_id
    if (context.context_id && user.context_id && context.context_id !== user.context_id) {
      return {
        ok: false,
        reason: 'Context mismatch entre usuario y módulo.',
      };
    }

    return { ok: true };
  }

  // =============================================================================
  // 7. Validación semántica (PDF: semantic validation)
  // =============================================================================
  static checkSemantic(input: string): ValidationResult {
    if (!this.config.enableSemanticValidation) return { ok: true };

    if (!input || input.length < 1) {
      return { ok: false, reason: 'Input vacío o inválido.' };
    }

    // Anti-spoof / anti-injection básico
    if (/<script>|<img|onerror=/gi.test(input)) {
      return { ok: false, reason: 'Input contiene patrones prohibidos.' };
    }

    return { ok: true };
  }

  // =============================================================================
  // 8. Validación de resumeURL (TTL + firma) — directo del PDF
  // =============================================================================
  static signResumeUrl(sessionId: string): string {
    const secret = this.config.resumeUrlSignatureSecret || 'aura_default_secret';

    const payload = `${sessionId}:${Date.now()}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const encoded = Buffer.from(`${payload}:${signature}`).toString('base64');
    return encoded;
  }

  static validateResumeUrl(encoded: string): ValidationResult {
    try {
      const secret = this.config.resumeUrlSignatureSecret || 'aura_default_secret';

      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const [sessionId, timestampStr, signature] = decoded.split(':');
      const timestamp = parseInt(timestampStr);

      // Verificar firma
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${sessionId}:${timestamp}`)
        .digest('hex');

      if (signature !== expectedSig) {
        return { ok: false, reason: 'Firma de resumeURL inválida.' };
      }

      // Verificar TTL (PDF: expiración)
      const ttl = (this.config.resumeUrlTtlMinutes || 60) * 60 * 1000;
      if (Date.now() - timestamp > ttl) {
        return { ok: false, reason: 'resumeURL expirado.' };
      }

      return { ok: true, meta: { sessionId } };
    } catch {
      return { ok: false, reason: 'resumeURL inválido.' };
    }
  }

  // =============================================================================
  // 9. Validación combinada
  // =============================================================================

  /**
   * Ejecuta TODAS las validaciones de seguridad.
   */
  static validateRequest(input: string, meta: RequestMeta): ValidationResult {
    // Origin
    const originCheck = this.checkOrigin(meta.origin);
    if (!originCheck.ok) return originCheck;

    // IP whitelist
    const ipCheck = this.checkIpWhitelist(meta.ip);
    if (!ipCheck.ok) return ipCheck;

    // JWT
    const jwtToken = meta.headers?.authorization?.replace('Bearer ', '');
    const jwtCheck = this.checkJwt(jwtToken);
    if (!jwtCheck.ok) return jwtCheck;

    // Context
    const contextCheck = this.checkContext({
      user: jwtCheck.meta,
      context: meta.context,
    });
    if (!contextCheck.ok) return contextCheck;

    // Semantic
    const semanticCheck = this.checkSemantic(input);
    if (!semanticCheck.ok) return semanticCheck;

    return { ok: true };
  }
}

export default SecurityLayer;
