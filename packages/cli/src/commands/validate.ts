import { Command, Flags } from '@oclif/core';
import path from 'path';
import fs from 'fs';
import { MCPValidator } from '../../../packages/mcp-ingestor/src/validators/mcpValidator';

export default class Validate extends Command {
	static description = 'Validar archivo MCP JSON contra el schema AURA';

	static flags = {
		strict: Flags.boolean({ char: 's', description: 'Validación estricta' }),
	};

	static args = [{ name: 'mcp', required: true, description: 'Ruta al archivo .mcp.json' }];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(Validate);
		const mcpPath = args.mcp;

		if (!fs.existsSync(mcpPath)) {
			this.error(`Archivo no encontrado: ${mcpPath}`);
			return;
		}

		try {
			const validator = new MCPValidator();
			const result = await validator.validate(mcpPath, flags.strict ?? false);

			if (result.valid) {
				this.log(`✅ MCP válido: ${mcpPath}`);
				if (result.warnings && result.warnings.length) {
					this.log(`⚠️ Advertencias:\n  - ${result.warnings.join('\n  - ')}`);
				}
				return;
			}

			this.log(`❌ MCP inválido: ${mcpPath}`);
			if (result.errors && result.errors.length) {
				this.log(`Errores:\n  - ${result.errors.join('\n  - ')}`);
			}
			process.exitCode = 2;
		} catch (err) {
			this.error(`Error al validar: ${(err as Error).message}`);
		}
	}
}
