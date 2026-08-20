import { createClient, RedisClientType } from 'redis';

import { Logger } from './logger.js';

/**
 * Servicio de caché con Redis.
 */
export class CacheService {
	private client: RedisClientType;

	private defaultTtlSeconds = 3600; // 1 hora

	constructor(redisUrl: string) {
		this.client = createClient({ url: redisUrl });

		this.client.on('error', (err) => {
			Logger.error('cache.error', { error: err.message });
		});

		Logger.debug('cache.service.initialized');
	}

	/**
	 * Conectar a Redis.
	 */
	async connect(): Promise<void> {
		await this.client.connect();
		Logger.info('cache.connected');
	}

	/**
	 * Obtener valor.
	 */
	async get<T = any>(key: string): Promise<T | null> {
		try {
			const value = await this.client.get(key);
			if (!value) return null;
			return JSON.parse(value) as T;
		} catch (err) {
			Logger.warn('cache.get.failed', { key, error: (err as Error).message });
			return null;
		}
	}

	/**
	 * Establecer valor.
	 */
	async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
		try {
			const ttl = ttlSeconds ?? this.defaultTtlSeconds;
			await this.client.setEx(key, ttl, JSON.stringify(value));
		} catch (err) {
			Logger.error('cache.set.failed', { key, error: (err as Error).message });
		}
	}

	/**
	 * Eliminar valor.
	 */
	async del(key: string): Promise<void> {
		try {
			await this.client.del(key);
		} catch (err) {
			Logger.error('cache.del.failed', { key, error: (err as Error).message });
		}
	}

	/**
	 * Limpiar por patrón.
	 */
	async delPattern(pattern: string): Promise<number> {
		try {
			const keys = await this.client.keys(pattern);
			if (keys.length === 0) return 0;
			return await this.client.del(keys);
		} catch (err) {
			Logger.error('cache.delPattern.failed', { pattern, error: (err as Error).message });
			return 0;
		}
	}

	/**
	 * Health check.
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.ping();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Cerrar conexión.
	 */
	async close(): Promise<void> {
		await this.client.quit();
		Logger.info('cache.closed');
	}
}

export let cache: CacheService;

export function initializeCache(redisUrl: string): CacheService {
	cache = new CacheService(redisUrl);
	return cache;
}

