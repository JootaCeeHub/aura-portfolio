import crypto from 'crypto';
import { Logger } from './logger.js';

/**
 * Encriptación AES-256-GCM para secretos en config.
 */
export class EncryptionService {
	private masterKey: Buffer;

	constructor(masterKeyHex: string) {
		if (masterKeyHex.length !== 64) {
			throw new Error('Master key must be 32 bytes (64 hex chars)');
		}
		this.masterKey = Buffer.from(masterKeyHex, 'hex');
	}

	/**
	 * Encriptar secret.
	 */
	encrypt(plaintext: string): string {
		try {
			const iv = crypto.randomBytes(16);
			const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

			let encrypted = cipher.update(plaintext, 'utf8', 'hex');
			encrypted += cipher.final('hex');
			const authTag = cipher.getAuthTag();

			// Formato: iv:encrypted:authTag
			return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
		} catch (err) {
			Logger.error('encryption.encrypt_failed', { error: (err as Error).message });
			throw err;
		}
	}

	/**
	 * Desencriptar secret.
	 */
	decrypt(ciphertext: string): string {
		try {
			const [ivHex, encrypted, authTagHex] = ciphertext.split(':');

			if (!ivHex || !encrypted || !authTagHex) {
				throw new Error('Invalid ciphertext format');
			}

			const iv = Buffer.from(ivHex, 'hex');
			const authTag = Buffer.from(authTagHex, 'hex');

			const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
			decipher.setAuthTag(authTag);

			let decrypted = decipher.update(encrypted, 'hex', 'utf8');
			decrypted += decipher.final('utf8');

			return decrypted;
		} catch (err) {
			Logger.error('encryption.decrypt_failed', { error: (err as Error).message });
			throw err;
		}
	}

	/**
	 * Hash password (bcrypt-like con PBKDF2).
	 */
	hashPassword(password: string): string {
		const salt = crypto.randomBytes(16);
		const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
		return `${salt.toString('hex')}:${hash.toString('hex')}`;
	}

	/**
	 * Verificar password.
	 */
	verifyPassword(password: string, hash: string): boolean {
		try {
			const [saltHex, storedHash] = hash.split(':');
			const salt = Buffer.from(saltHex, 'hex');
			const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
			return computedHash.toString('hex') === storedHash;
		} catch {
			return false;
		}
	}
}

export const encryption = new EncryptionService(process.env.MASTER_KEY || generateMasterKey());

function generateMasterKey(): string {
	Logger.warn('encryption.using_generated_key', { note: 'Set MASTER_KEY env var for production' });
	return crypto.randomBytes(32).toString('hex');
}

