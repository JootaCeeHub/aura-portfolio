import { promises as fs } from 'fs';
import { Logger } from '../../../core-aura-mcp/src/lib/logger';

export class TextParser {
	async parse(filePath: string): Promise<string> {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			Logger.debug('textParser.parse.success', { file: filePath, size: content.length });
			return content;
		} catch (error) {
			Logger.error('textParser.parse.error', { file: filePath, error: (error as Error).message });
			throw error;
		}
	}
}
