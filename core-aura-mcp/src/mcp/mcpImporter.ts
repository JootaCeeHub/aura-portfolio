import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../lib/logger.js';
import { EventEmitter } from 'events';

export const MCPEvents = new EventEmitter();

export async function importMcpFileToProject(srcPath: string, projectFolder?: string): Promise<string> {
	const absSrc = path.isAbsolute(srcPath) ? srcPath : path.resolve(process.cwd(), srcPath);
	const projectRoot = projectFolder ?? process.cwd();
	const destFolder = path.join(projectRoot, 'mcp_imported');

	try {
		const raw = await fs.readFile(absSrc, 'utf-8');
		const data = JSON.parse(raw);

		if (!data || !data.schemaVersion || !data.metadata || !data.content) {
			throw new Error('Invalid MCP payload');
		}

		await fs.mkdir(destFolder, { recursive: true });

		const destName = `${path.basename(srcPath, path.extname(srcPath))}.${Date.now()}.mcp.json`;
		const destPath = path.join(destFolder, destName);

		await fs.writeFile(destPath, JSON.stringify(data, null, 2), 'utf-8');

		MCPEvents.emit('mcp:imported', { path: destPath, metadata: data.metadata });
		Logger.info('mcpImporter.imported', { src: absSrc, dest: destPath });

		return destPath;
	} catch (err) {
		Logger.error('mcpImporter.error', { src: srcPath, error: (err as Error).message });
		throw err;
	}
}

export function onMcpImported(cb: (payload: any) => void): () => void {
	MCPEvents.on('mcp:imported', cb);
	return () => MCPEvents.off('mcp:imported', cb);
}

