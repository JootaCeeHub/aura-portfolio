import { Router, Request, Response } from 'express';
import { configService } from '../../services/configService.js';
import { Logger } from '../../lib/logger.js';
import path from 'path';
import fs from 'fs';
import Ajv from 'ajv';

const router = Router();

let validator: Ajv.ValidateFunction | null = null;

function loadValidator(): Ajv.ValidateFunction | null {
  if (validator) return validator;
  const candidates = [
    path.join(process.cwd(), 'core-aura-mcp', 'config', 'config.schema.json'),
    path.join(process.cwd(), 'config', 'config.schema.json'),
  ];
  const schemaPath = candidates.find((p) => fs.existsSync(p));
  if (!schemaPath) {
    Logger.warn('api.config.schema_not_found', { candidates });
    return null;
  }
  try {
    const raw = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(raw);
    const ajv = new Ajv({ allErrors: true });
    validator = ajv.compile(schema);
    Logger.info('api.config.validator_loaded', { schemaPath });
    return validator;
  } catch (err) {
    Logger.warn('api.config.validator_load_failed', { error: (err as Error).message });
    return null;
  }
}

// GET /api/config - devolver configuración actual (intenta cargar si no está en memoria)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const cfg = configService.getConfig() ?? (await configService.load());
    if (!cfg) {
      res.status(404).json({ error: 'No configuration found' });
      return;
    }
    res.json({ config: cfg });
  } catch (err) {
    Logger.error('api.config.get.error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error loading configuration' });
  }
});

// PUT /api/config - reemplazar configuración (simple control, crea snapshot)
router.put('/', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const v = loadValidator();
    if (v) {
      const valid = v(newConfig);
      if (!valid) {
        res.status(400).json({ error: 'Validation failed', errors: v.errors });
        return;
      }
    }

    await configService.save(newConfig, (req as any).user?.id ?? 'api');
    res.json({ ok: true });
  } catch (err) {
    Logger.error('api.config.put.error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error saving configuration' });
  }
});

// POST /api/config/preview - validar sin aplicar
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Invalid payload', fields: ['root'] });
      return;
    }

    const v = loadValidator();
    if (!v) {
      res.json({ valid: true, warning: 'No schema available for validation' });
      return;
    }
    const valid = v(payload);
    if (!valid) {
      const fieldErrors: Record<string, string[]> = {};
      v.errors?.forEach((err: any) => {
        const path = err.instancePath || 'root';
        const msg = `${err.schemaPath}: ${err.message}`;
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(msg);
      });
      res.json({ valid: false, errors: fieldErrors, rawErrors: v.errors });
      return;
    }
    res.json({ valid: true });
  } catch (err) {
    Logger.error('api.config.preview.error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error validating configuration' });
  }
});

// GET /api/config/history - listar snapshots
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const list = await configService.listSnapshots();
    res.json({ snapshots: list });
  } catch (err) {
    Logger.error('api.config.history.error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error listing snapshots' });
  }
});

// POST /api/config/restore - restaurar snapshot
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { file } = req.body ?? {};
    if (!file) {
      res.status(400).json({ error: 'snapshot file required' });
      return;
    }
    // seguridad: evitar path traversal y normalizar
    const normalized = path.normalize(file);
    if (!normalized.includes(path.join('config', 'backups')) && !normalized.includes(path.join('config', 'backups').replace(/\\/g, '/'))) {
      res.status(403).json({ error: 'Invalid snapshot path' });
      return;
    }
    const restored = await configService.restore(file);
    res.json({ ok: true, config: restored });
  } catch (err) {
    Logger.error('api.config.restore.error', { error: (err as Error).message });
    res.status(500).json({ error: 'Error restoring snapshot' });
  }
});

export default router;
