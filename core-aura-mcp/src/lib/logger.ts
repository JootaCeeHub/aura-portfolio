// import type { Request, Response, NextFunction } from 'express';

// Check environment
const isBrowser = typeof window !== 'undefined';
const isNode = !isBrowser;

// Dynamic imports or stubs
let winston: any = null;
let AsyncLocalStorage: any = null;

if (isNode) {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    winston = require('winston');
    AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    // console.error('Failed to load server dependencies', e);
  }
}

// type Store = { correlationId?: string };

export class Logger {
  private static instance?: any; // winston.Logger | Console
  private static als: any = isNode && AsyncLocalStorage ? new AsyncLocalStorage() : null;
  private static readonly serviceName = isNode ? (process.env.SERVICE_NAME ?? 'aura-mcp-core') : 'aura-ui';
  // memory capture for tests
  private static _memoryLogs: any[] = [];
  private static _memoryTransport?: any;

  static initialize() {
    if (this.instance) return;

    if (isNode && winston) {
      const transports: any[] = [];

      // File transports (rotación básica)
      try {
        transports.push(
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
          })
        );
        transports.push(
            new winston.transports.File({
              filename: 'logs/combined.log',
              maxsize: 10 * 1024 * 1024,
              maxFiles: 7,
              tailable: true,
            })
          );
      } catch {
        console.warn('Could not initialize file transports (likely standard restricted env)');
      }

      // Console: JSON en prod, pretty en dev
      const isProd = process.env.NODE_ENV === 'production';
      transports.push(
        new winston.transports.Console({
          format: isProd
            ? winston.format.json()
            : winston.format.combine(winston.format.colorize(), winston.format.simple()),
        })
      );

      // Optional HTTP transport (LOG_HTTP_URL)
      const httpUrl = process.env.LOG_HTTP_URL;
      if (httpUrl) {
        try {
          const parsed = new URL(httpUrl);
          transports.push(
            new winston.transports.Http({
              host: parsed.hostname,
              path: parsed.pathname + (parsed.search ?? ''),
              port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
              ssl: parsed.protocol === 'https:',
            })
          );
        } catch {
          // ignore invalid url
        }
      }

      this.instance = winston.createLogger({
        level: process.env.LOG_LEVEL ?? 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: this.serviceName },
        transports,
      });
    } else {
        // Fallback or Browser
        this.instance = console;
    }
  }

  // Test helpers
  static addMemoryTransport() {
    if (!isNode || !winston) return;
    this.initialize();
    if (this._memoryTransport) return;
    try {
        const memTransport = new winston.transports.Stream({
        stream: {
            write: (chunk: any) => {
            try {
                const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
                this._memoryLogs.push(parsed);
            } catch {
                this._memoryLogs.push(chunk);
            }
            },
        },
        });
        this._memoryTransport = memTransport;
        this.instance!.add(memTransport);
    } catch {
      // Ignore memory transport errors
    }
  }

  static getMemoryLogs() {
    return this._memoryLogs.slice();
  }

  static clearMemoryLogs() {
    this._memoryLogs = [];
    if (isNode && winston && this._memoryTransport && this.instance) {
      try {
        this.instance.remove(this._memoryTransport);
      } catch {
        // Ignore removal errors
      }
      this._memoryTransport = undefined;
    }
  }

  static runWithId<T>(correlationId: string, fn: () => T): T {
    this.initialize();
    if (isNode && this.als) {
        return this.als.run({ correlationId }, fn);
    }
    return fn();
  }

  static setCorrelationId(correlationId: string) {
    this.initialize();
    if (isNode && this.als) {
        this.als.enterWith({ correlationId });
    }
  }

  static getCorrelationId(): string | undefined {
    if (isNode && this.als) {
        return this.als.getStore()?.correlationId;
    }
    return undefined;
  }

  private static withMeta(meta?: Record<string, any>) {
    const cid = this.getCorrelationId();
    return { ...(meta ?? {}), ...(cid ? { correlationId: cid } : {}) };
  }

  static info(message: string, meta?: Record<string, any>) {
    this.initialize();
    if (isNode && this.instance && typeof this.instance.info === 'function') {
        this.instance.info(message, this.withMeta(meta));
    } else {
        console.info(`[INFO] ${message}`, meta || '');
    }
  }

  static debug(message: string, meta?: Record<string, any>) {
    this.initialize();
    if (isNode && this.instance && typeof this.instance.debug === 'function') {
        this.instance.debug(message, this.withMeta(meta));
    } else {
        // console.debug(`[DEBUG] ${message}`, meta || '');
    }
  }

  static warn(message: string, meta?: Record<string, any>) {
    this.initialize();
    if (isNode && this.instance && typeof this.instance.warn === 'function') {
        this.instance.warn(message, this.withMeta(meta));
    } else {
        console.warn(`[WARN] ${message}`, meta || '');
    }
  }

  static error(message: string, meta?: Record<string, any>) {
    this.initialize();
    if (isNode && this.instance && typeof this.instance.error === 'function') {
        this.instance.error(message, this.withMeta(meta));
    } else {
        console.error(`[ERROR] ${message}`, meta || '');
    }
  }

  // Middleware Express que garantiza correlationId y mide duration_ms
  static expressCorrelationMiddleware(headerName = 'x-correlation-id') {
    return (req: any, res: any, next: any) => {
      // Stub for browser
      if (!isNode) {
          next();
          return;
      }

      const incoming = (req.headers[headerName] as string) || undefined;
      const correlationId = incoming ?? cryptoSafeUuid();

      this.runWithId(correlationId, () => {
        res.setHeader('X-Correlation-ID', correlationId);
        req.correlationId = correlationId;

        const start = process.hrtime.bigint();
        this.info('request.started', { method: req.method, path: req.url });

        res.on('finish', () => {
          const diffNs = process.hrtime.bigint() - start;
          const duration_ms = Number(diffNs / BigInt(1_000_000));
          this.info('request.finished', {
            method: req.method,
            path: req.url,
            statusCode: res.statusCode,
            duration_ms,
          });
        });

        next();
      });
    };
  }
  static audit(message: string, meta?: Record<string, any>) {
    this.info(message, { ...meta, _audit: true });
  }
}

// helper para UUID
function cryptoSafeUuid(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// Inicializar al importar
Logger.initialize();

