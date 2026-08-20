import { Pool, QueryResult, QueryResultRow } from 'pg';

import { Logger } from './logger.js';

/**
 * Servicio de base de datos con pool de conexiones a PostgreSQL.
 */
export type AccessLevel = 'READ_ONLY' | 'READ_WRITE';

export class DatabaseService {
	private pool: Pool;

	constructor(connectionString: string) {
		this.pool = new Pool({
			connectionString,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000,
		});

		this.pool.on('error', (err) => {
			Logger.error('database.pool.error', { error: err.message });
		});

		Logger.debug('database.service.initialized');
	}

	/**
	 * Ejecutar query.
	 */
	async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
		try {
			const result = await this.pool.query<T>(sql, params);
			return result;
		} catch (err) {
			Logger.error('database.query.failed', { sql, error: (err as Error).message });
			throw err;
		}
	}

	/**
	 * Obtener una fila.
	 */
	async queryOne<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T | null> {
		const result = await this.query<T>(sql, params);
		return result.rows[0] ?? null;
	}

	/**
	 * Obtener múltiples filas.
	 */
	async queryMany<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T[]> {
		const result = await this.query<T>(sql, params);
		return result.rows;
	}

	async select<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T[]> {
		return this.queryMany<T>(sql, params);
	}

	async write<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T[]> {
		return this.queryMany<T>(sql, params); // or query() if full result needed
	}

	/**
	 * Insertar y retornar fila.
	 */
	async insert<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T> {
		const result = await this.queryOne<T>(sql, params);
		if (!result) throw new Error('Insert failed: no rows returned');
		return result;
	}

	/**
	 * Transacción.
	 */
	async transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			const result = await fn(client);
			await client.query('COMMIT');
			return result;
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}
	}

	/**
	 * Health check.
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.pool.query('SELECT 1');
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Cerrar pool.
	 */
	async close(): Promise<void> {
		await this.pool.end();
		Logger.info('database.pool.closed');
	}
}

export let database: DatabaseService;

export function initializeDatabase(connectionString: string): DatabaseService {
	database = new DatabaseService(connectionString);
	return database;
}

