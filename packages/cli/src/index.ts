import { Command } from '@oclif/core';
import { Logger } from '../../core-aura-mcp/src/lib/logger';

export abstract class AuraCommand extends Command {
	protected logger = Logger;

	async finally(err?: Error | string): Promise<void> {
		if (err) {
			this.logger.error('cli.command.error', { error: String(err) });
		}
	}
}

export class AuraCLI extends Command {
	static description = 'AURA MCP - CLI Tool for Agent Orchestration';
	static version = '1.0.0';

	async run(): Promise<void> {
		this.log('🚀 AURA MCP CLI');
		this.log('Usa: aura <comando> [args]');
		this.log('');
		this.log('Comandos disponibles:');
		this.log('  aura ingest <file>      - Ingestar documento (PDF/TXT/MCP)');
		this.log('  aura validate <file>    - Validar archivo MCP JSON');
		this.log('');
		this.log('Ejemplos:');
		this.log('  aura ingest spec.pdf --auto-refine');
		this.log('  aura validate mcp_imported/spec.mcp.json --strict');
	}
}

export default AuraCLI;
