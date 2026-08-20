import { Logger } from '../lib/logger.js';

/**
 * Configuración global del sistema AURA.
 */
export interface AuraConfig {
	core: {
		port: number;
		wsPath: string;
		enableWs: boolean;
		pollingIntervalMs: number;
		environment: 'development' | 'staging' | 'production';
	};
	auth: {
		enabled: boolean;
		jwtSecret: string;
		tokenExpiresIn: string;
		maxFailedAttempts: number;
	};
	agents: {
		orchestrator: { enabled: boolean; temperature: number; maxTokens: number };
		developer: { enabled: boolean; temperature: number; maxTokens: number };
		trading: { enabled: boolean; temperature: number; maxTokens: number };
		analyst: { enabled: boolean; temperature: number; maxTokens: number };
		[key: string]: { enabled: boolean; temperature: number; maxTokens: number };
	};
	logging: {
		level: 'debug' | 'info' | 'warn' | 'error';
		httpUrl?: string;
		transports: string[];
	};
	observability: {
		enabled: boolean;
		exporters: ('jaeger' | 'prometheus' | 'datadog')[];
		jaegerUrl?: string;
		prometheusPort?: number;
	};
	metrics: {
		errorRateThreshold: number;
		p99LatencyThreshold: number;
		enableAlerts: boolean;
	};
}

const DEFAULT_CONFIG: AuraConfig = {
	core: {
		port: Number(process.env.PORT ?? 3000),
		wsPath: '/ws',
		enableWs: process.env.ENABLE_WS !== 'false',
		pollingIntervalMs: 5000,
		environment: (process.env.NODE_ENV as any) ?? 'development',
	},
	auth: {
		enabled: process.env.ENABLE_AUTH !== 'false',
		jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-long!!',
		tokenExpiresIn: '24h',
		maxFailedAttempts: 5,
	},
	agents: {
		orchestrator: { enabled: true, temperature: 0.7, maxTokens: 2000 },
		developer: { enabled: true, temperature: 0.5, maxTokens: 4000 },
		trading: { enabled: true, temperature: 0.3, maxTokens: 3000 },
		analyst: { enabled: true, temperature: 0.6, maxTokens: 2500 },
	},
	logging: {
		level: (process.env.LOG_LEVEL as any) ?? 'debug',
		httpUrl: process.env.LOG_HTTP_URL,
		transports: ['console', 'memory'],
	},
	observability: {
		enabled: process.env.OBSERVABILITY_ENABLED !== 'false',
		exporters: process.env.OBSERVABILITY_EXPORTERS
			? (process.env.OBSERVABILITY_EXPORTERS.split(',') as any)
			: ['jaeger'],
		jaegerUrl: process.env.JAEGER_URL ?? 'http://localhost:6831',
		prometheusPort: Number(process.env.PROMETHEUS_PORT ?? 9090),
	},
	metrics: {
		errorRateThreshold: Number(process.env.METRICS_ERROR_RATE_THRESHOLD ?? 0.05),
		p99LatencyThreshold: Number(process.env.METRICS_P99_LATENCY_THRESHOLD ?? 500),
		enableAlerts: process.env.METRICS_ENABLE_ALERTS !== 'false',
	},
};

/**
 * Config service global (singleton).
 */
class ConfigService {
	private config: AuraConfig;

	constructor(customConfig?: Partial<AuraConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...customConfig };
		Logger.debug('config.service.initialized', {
			env: this.config.core.environment,
			authEnabled: this.config.auth.enabled,
		});
	}

	/**
	 * Obtener configuración completa.
	 */
	getConfig(): AuraConfig {
		return this.config;
	}

	/**
	 * Obtener valor específico.
	 */
	get<T = any>(path: string): T {
		const parts = path.split('.');
		let current: any = this.config;

		for (const part of parts) {
			current = current?.[part];
		}

		return current as T;
	}

	/**
	 * Establecer valor.
	 */
	set<T = any>(path: string, value: T): void {
		const parts = path.split('.');
		const key = parts.pop();

		let current: any = this.config;
		for (const part of parts) {
			if (!current[part]) current[part] = {};
			current = current[part];
		}

		if (key) {
			current[key] = value;
			Logger.debug('config.service.set', { path });
		}
	}

	/**
	 * Reset a defaults.
	 */
	reset(): void {
		this.config = { ...DEFAULT_CONFIG };
	}
}

export const configService = new ConfigService();
