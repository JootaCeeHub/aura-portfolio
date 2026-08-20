import { promises as fs } from 'fs';
import { z } from 'zod';
import { Logger } from '../../../core-aura-mcp/src/lib/logger';

const MCPSchema = z.object({
	schemaVersion: z.string(),
	metadata: z.object({
		title: z.string(),
		description: z.string(),
		importedFrom: z.string(),
		importDate: z.string(),
		wordCount: z.number(),
		lineCount: z.number(),
	}),
	content: z.object({
		raw: z.string(),
		cleaned: z.string(),
	}),
	structure: z.object({
		tools: z.array(z.any()).optional(),
		resources: z.array(z.any()).optional(),
		prompts: z.array(z.any()).optional(),
	}),
	status: z.enum(['raw_import', 'refined', 'validated', 'published']),
});

export interface ValidationResult {
	valid: boolean;
	errors?: string[];
	warnings?: string[];
}

export class MCPValidator {
	async validate(filePath: string, strict: boolean = false): Promise<ValidationResult> {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const data = JSON.parse(content);

			const result = MCPSchema.safeParse(data);

			if (result.success) {
				Logger.info('mcpValidator.validate.success', { file: filePath });
				return {
					valid: true,
					warnings: strict ? [] : ['Validación no-estricta habilitada'],
				};
			} else {
				const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
				Logger.warn('mcpValidator.validate.failed', { file: filePath, errors });
				return {
					valid: false,
					errors,
				};
			}
		} catch (error) {
			Logger.error('mcpValidator.validate.error', { file: filePath, error: (error as Error).message });
			return {
				valid: false,
				errors: [(error as Error).message],
			};
		}
	}
}
