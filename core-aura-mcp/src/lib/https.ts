import https from 'https';
import fs from 'fs';
import { Logger } from './logger.js';

/**
 * Configuración HTTPS/TLS para production.
 * Requisitos:
 * - Certificados válidos (Let's Encrypt en prod)
 * - TLS 1.2+ obligatorio
 * - HSTS headers
 * - Perfect Forward Secrecy (PFS)
 */
export interface TlsConfig {
	certPath: string;
	keyPath: string;
	caPath?: string;
	minTlsVersion?: string; // default: TLSv1.2
	ciphers?: string;
}

export class HttpsManager {
	private tlsConfig: TlsConfig;

	constructor(tlsConfig: TlsConfig) {
		this.tlsConfig = tlsConfig;
		this.validateCertificates();
	}

	/**
	 * Crear HTTPS server con opciones seguras.
	 */
	createSecureServer(requestListener: any): https.Server {
		const options: https.ServerOptions = {
			cert: fs.readFileSync(this.tlsConfig.certPath),
			key: fs.readFileSync(this.tlsConfig.keyPath),
			ca: this.tlsConfig.caPath ? fs.readFileSync(this.tlsConfig.caPath) : undefined,
			minVersion: 'TLSv1.2',
			ciphers: this.tlsConfig.ciphers || this.getSecureCiphers(),
			honorCipherOrder: true,
			sessionTimeout: 3600,
		};

		const server = https.createServer(options, requestListener);

		Logger.info('https.server.created', {
			tlsVersion: options.minVersion,
			ciphers: '✓ PFS enabled',
		});

		return server;
	}

	/**
	 * Obtener cipher suites seguros (OWASP recomendación).
	 */
	private getSecureCiphers(): string {
		return [
			'TLS_AES_256_GCM_SHA384',
			'TLS_CHACHA20_POLY1305_SHA256',
			'TLS_AES_128_GCM_SHA256',
			'ECDHE-ECDSA-AES256-GCM-SHA384',
			'ECDHE-RSA-AES256-GCM-SHA384',
			'ECDHE-ECDSA-CHACHA20-POLY1305',
			'ECDHE-RSA-CHACHA20-POLY1305',
			'ECDHE-ECDSA-AES128-GCM-SHA256',
			'ECDHE-RSA-AES128-GCM-SHA256',
		].join(':');
	}

	/**
	 * Validar certificados.
	 */
	private validateCertificates(): void {
		const { certPath, keyPath } = this.tlsConfig;

		if (!fs.existsSync(certPath)) {
			throw new Error(`Certificate not found: ${certPath}`);
		}

		if (!fs.existsSync(keyPath)) {
			throw new Error(`Private key not found: ${keyPath}`);
		}

		// Validar permisos del key (debe ser 600)
		const keyStats = fs.statSync(keyPath);
		if ((keyStats.mode & 0o077) !== 0) {
			Logger.warn('https.key.permissions', { mode: '0o' + (keyStats.mode & parseInt('777', 8)).toString(8) });
		}

		Logger.debug('https.certificates.validated');
	}

	/**
	 * HSTS header (HTTP Strict-Transport-Security).
	 */
	static getHstsHeader(): Record<string, string> {
		return {
			'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
		};
	}

	/**
	 * Security headers (OWASP).
	 */
	static getSecurityHeaders(): Record<string, string> {
		return {
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'X-XSS-Protection': '1; mode=block',
			'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
		};
	}
}

