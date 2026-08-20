import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../../lib/logger.js';
// import { validate, Schemas } from '../../lib/validation';

const router = Router();

const MCP_FOLDER = process.env.MCP_IMPORTED_DIR ?? path.join(process.cwd(), 'mcp_imported');

/**
 * GET /api/mcp
 * Listar todos los MCPs importados en la carpeta mcp_imported.
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const files = await fs.readdir(MCP_FOLDER).catch(() => []);
		const mcpFiles = files.filter((f) => f.endsWith('.mcp.json'));

		const mcps = await Promise.all(
			mcpFiles.map(async (file) => {
				const fullPath = path.join(MCP_FOLDER, file);
				try {
					const content = await fs.readFile(fullPath, 'utf-8');
					const data = JSON.parse(content);
					return {
						id: file.replace('.mcp.json', ''),
						name: file,
						path: fullPath,
						metadata: data.metadata,
						status: data.status,
						createdAt: (await fs.stat(fullPath)).birthtime,
					};
				} catch {
					return null;
				}
			})
		);

		const validMcps = mcps.filter((m) => m !== null);
		Logger.info('api.mcp.list', { count: validMcps.length });

		res.json({ mcps: validMcps, total: validMcps.length });
	} catch (err) {
		Logger.error('api.mcp.list.error', { error: (err as Error).message });
		res.status(500).json({ error: 'Error al listar MCPs' });
	}
});

/**
 * GET /api/mcp/:id
 * Obtener contenido de un MCP específico.
 */
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const fileName = id.endsWith('.mcp.json') ? id : `${id}.mcp.json`;
		const filePath = path.join(MCP_FOLDER, fileName);

		// Seguridad: evitar path traversal
		if (!filePath.startsWith(MCP_FOLDER)) {
			res.status(403).json({ error: 'Acceso denegado' });
			return;
		}

		const content = await fs.readFile(filePath, 'utf-8');
		const data = JSON.parse(content);

		Logger.info('api.mcp.get', { id });
		res.json(data);
	} catch {
		Logger.warn('api.mcp.get.not_found', { id: req.params.id });
		res.status(404).json({ error: 'MCP no encontrado' });
	}
});

/**
 * POST /api/mcp/validate
 * Validar un MCP sin guardarlo (body contiene el JSON).
 */
router.post('/validate', async (req: Request, res: Response) => {
	try {
		const payload = req.body;

		if (!payload || typeof payload !== 'object') {
			res.status(400).json({ error: 'Payload inválido' });
			return;
		}

		// Validación mínima
		if (!payload.schemaVersion || !payload.metadata || !payload.content) {
			res.status(400).json({
				error: 'MCP inválido: faltan campos (schemaVersion/metadata/content)',
			});
			return;
		}

		Logger.info('api.mcp.validate.success', { title: payload.metadata.title });
		res.json({ valid: true, metadata: payload.metadata });
	} catch (err) {
		Logger.error('api.mcp.validate.error', { error: (err as Error).message });
		res.status(500).json({ error: 'Error al validar MCP' });
	}
});

/**
 * DELETE /api/mcp/:id
 * Eliminar un MCP (soft delete: renombrar a .deleted).
 */
router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const fileName = id.endsWith('.mcp.json') ? id : `${id}.mcp.json`;
		const filePath = path.join(MCP_FOLDER, fileName);

		if (!filePath.startsWith(MCP_FOLDER)) {
			res.status(403).json({ error: 'Acceso denegado' });
			return;
		}

		const deletedPath = filePath.replace('.mcp.json', '.deleted.json');
		await fs.rename(filePath, deletedPath);

		Logger.info('api.mcp.deleted', { id });
		res.json({ deleted: true, id });
	} catch (err) {
		Logger.error('api.mcp.delete.error', { error: (err as Error).message });
		res.status(500).json({ error: 'Error al eliminar MCP' });
	}
});

export default router;
