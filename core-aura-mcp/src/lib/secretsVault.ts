import { Logger } from './logger.js';

/**
 * Interfaz de almacén de secretos (abstracción para Vault, AWS Secrets, etc).
 */
export interface SecretsStore {
	get(key: string): Promise<string | undefined>;
	set(key: string, value: string): Promise<void>;
	delete(key: string): Promise<void>;
	list(): Promise<string[]>;
}

/**
 * Implementación en memoria simple (para desarrollo).
 */
class MemorySecretsStore implements SecretsStore {
	private store: Map<string, string> = new Map();

	async get(key: string): Promise<string | undefined> {
		return this.store.get(key);
	}

	async set(key: string, value: string): Promise<void> {
		this.store.set(key, value);
		Logger.debug('secrets.store.set', { key, redacted: true });
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
		Logger.debug('secrets.store.delete', { key });
	}

	async list(): Promise<string[]> {
		return Array.from(this.store.keys());
	}
}

/**
 * Vault de secretos con fallback a variables de entorno.
 */
export class SecretsVault {
	private store: SecretsStore;

	constructor(customStore?: SecretsStore) {
		this.store = customStore ?? new MemorySecretsStore();
		Logger.debug('secrets.vault.initialized');
	}

	/**
	 * Obtener secreto (con fallback a env vars).
	 */
	async getSecret(key: string): Promise<string | undefined> {
		// Intentar desde store primero
		const fromStore = await this.store.get(key);
		if (fromStore) return fromStore;

		// Fallback a env var
		const envKey = `SECRET_${key.toUpperCase()}`;
		return process.env[envKey];
	}

	/**
	 * Guardar secreto.
	 */
	async setSecret(key: string, value: string): Promise<void> {
		await this.store.set(key, value);
	}

	/**
	 * Eliminar secreto.
	 */
	async deleteSecret(key: string): Promise<void> {
		await this.store.delete(key);
	}

	/**
	 * Listar claves (sin valores).
	 */
	async listSecretKeys(): Promise<string[]> {
		return this.store.list();
	}

	/**
	 * Validar secreto requerido.
	 */
	async requireSecret(key: string): Promise<string> {
		const value = await this.getSecret(key);
		if (!value) {
			throw new Error(`Required secret not found: ${key}`);
		}
		return value;
	}
}

export const secretsVault = new SecretsVault();

