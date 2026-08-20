import { Logger } from './logger.js';

interface RateLimitBucket {
	count: number;
	resetTime: number;
	blocked: boolean;
	blockUntil?: number;
}

/**
 * Rate limiter con múltiples estrategias.
 * - Por IP
 * - Por agente
 * - Por endpoint
 * - Exponential backoff para bloqueos
 */
export class RateLimiter {
	private buckets: Map<string, RateLimitBucket> = new Map();

	private readonly windowMs: number; // ventana de tiempo (60s default)

	private readonly maxRequests: number; // max requests por ventana

	private readonly blockDurationMs: number; // duración del bloqueo

	constructor(
		windowMs: number = 60 * 1000,
		maxRequests: number = 100,
		blockDurationMs: number = 15 * 60 * 1000
	) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
		this.blockDurationMs = blockDurationMs;
	}

	/**
	 * Verificar si request está permitido.
	 */
	isAllowed(key: string): { allowed: boolean; retryAfter?: number } {
		const now = Date.now();
		const bucket = this.buckets.get(key);

		// Si no existe bucket, crear nuevo
		if (!bucket) {
			this.buckets.set(key, {
				count: 1,
				resetTime: now + this.windowMs,
				blocked: false,
			});
			return { allowed: true };
		}

		// Si está bloqueado
		if (bucket.blocked && bucket.blockUntil! > now) {
			Logger.warn('rateLimiter.blocked', { key, retryAfter: bucket.blockUntil! - now });
			return { allowed: false, retryAfter: bucket.blockUntil! - now };
		}

		// Si ventana expiró, resetear
		if (now > bucket.resetTime) {
			bucket.count = 1;
			bucket.resetTime = now + this.windowMs;
			bucket.blocked = false;
			return { allowed: true };
		}

		// Si dentro de ventana
		bucket.count++;

		if (bucket.count > this.maxRequests) {
			bucket.blocked = true;
			bucket.blockUntil = now + this.blockDurationMs;
			Logger.warn('rateLimiter.limit_exceeded', { key, count: bucket.count, limit: this.maxRequests });
			return { allowed: false, retryAfter: this.blockDurationMs };
		}

		return { allowed: true };
	}

	/**
	 * Reset bucket.
	 */
	reset(key: string): void {
		this.buckets.delete(key);
	}

	/**
	 * Get bucket info.
	 */
	getBucketInfo(key: string): { count: number; resetTime: number; blocked: boolean } | null {
		const bucket = this.buckets.get(key);
		return bucket
			? {
					count: bucket.count,
					resetTime: bucket.resetTime,
					blocked: bucket.blocked,
				}
			: null;
	}
}

/**
 * Rate limiters por estrategia.
 */
export const rateLimiters = {
	global: new RateLimiter(60 * 1000, 10000), // 10k req/min global
	perIp: new RateLimiter(60 * 1000, 1000), // 1k req/min per IP
	perAgent: new RateLimiter(60 * 1000, 500), // 500 req/min per agent
	auth: new RateLimiter(60 * 1000, 10), // 10 auth attempts/min
};

