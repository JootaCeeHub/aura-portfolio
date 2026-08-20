import { z } from 'zod';
import { Logger } from './logger.js';

/**
 * Esquemas Zod para validación estricta (OWASP).
 */
export const Schemas = {
	// Auth
	loginInput: z.object({
		agentId: z.string().min(3).max(255),
		password: z.string().min(8).max(128),
	}),

	// Agent execution
	agentExecutionInput: z.object({
		agentId: z.string().min(1).max(255),
		input: z.string().max(10000), // Prevenir DoS
		correlationId: z.string().optional(),
	}),

	// Tool execution
	toolExecutionInput: z.object({
		toolName: z.string().min(1).max(255),
		args: z.record(z.any()).optional(),
	}),

	// Configuration
	configInput: z.object({
		port: z.number().min(1024).max(65535),
		enableWs: z.boolean(),
		tlsPath: z.string().optional(),
	}),

	// Query params
	queryParams: z.object({
		limit: z.number().min(1).max(10000).optional(),
		offset: z.number().min(0).optional(),
		filter: z.string().max(1000).optional(),
	}),
};

/**
 * Validador con error handling.
 */
export function validate<T>(schema: z.ZodSchema, data: unknown): T {
	try {
		return schema.parse(data) as T;
	} catch (err) {
		if (err instanceof z.ZodError) {
			Logger.warn('validation.failed', {
				errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
			});
			throw new Error(`Validation failed: ${err.errors[0]?.message}`);
		}
		throw err;
	}
}

/**
 * Safe parse (no throw).
 */
export function safeParse<T>(schema: z.ZodSchema, data: unknown): T | null {
	try {
		return schema.parse(data) as T;
	} catch {
		return null;
	}
}

