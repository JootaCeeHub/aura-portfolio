import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import bodyParser from 'body-parser';

// ...existing server bootstrap code...

const app = express();
app.use(cors()); // permitir desde frontend dev server
app.use(bodyParser.json());

const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SNAP_DIR = path.join(CONFIG_DIR, 'snapshots');

async function ensureDirs() {
	try {
		await fs.mkdir(CONFIG_DIR, { recursive: true });
		await fs.mkdir(SNAP_DIR, { recursive: true });
	} catch (e) {
		console.error('mkdir error', e);
	}
}

ensureDirs();

// GET current config
app.get('/api/config', async (req, res) => {
	try {
		const exists = await fs.access(CONFIG_FILE).then(() => true).catch(() => false);
		if (!exists) return res.json({ config: {} });
		const txt = await fs.readFile(CONFIG_FILE, 'utf-8');
		return res.json({ config: JSON.parse(txt) });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: String(err) });
	}
});

// PUT save config (creates snapshot)
app.put('/api/config', async (req, res) => {
	try {
		const cfg = req.body;
		// crear snapshot con timestamp
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		const snapFile = `snapshot-${ts}.json`;
		await fs.writeFile(path.join(SNAP_DIR, snapFile), JSON.stringify({ createdAt: new Date().toISOString(), createdBy: 'local', config: cfg }, null, 2));
		await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2));
		return res.json({ ok: true, config: cfg });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: String(err) });
	}
});

// POST preview - ejecuta validaciones básicas
app.post('/api/config/preview', async (req, res) => {
	try {
		const cfg = req.body;
		const errors: Record<string, string[]> = {};
		// Ejemplo simple de validación: require fields
		if (!cfg) {
			return res.json({ valid: false, errors: { _global: ['config missing'] } });
		}
		if (!cfg.name) errors['name'] = ['El campo "name" es requerido'];
		// agrega más reglas según necesites...
		const valid = Object.keys(errors).length === 0;
		return res.json({ valid, errors, preview: cfg });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: String(err) });
	}
});

// GET history snapshots
app.get('/api/config/history', async (req, res) => {
	try {
		const files = await fs.readdir(SNAP_DIR);
		const snapshots = await Promise.all(files.map(async f => {
			const txt = await fs.readFile(path.join(SNAP_DIR, f), 'utf-8');
			try {
				const parsed = JSON.parse(txt);
				return { file: f, createdAt: parsed.createdAt ?? null, createdBy: parsed.createdBy ?? null };
			} catch {
				return { file: f };
			}
		}));
		return res.json({ snapshots });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: String(err) });
	}
});

// POST restore snapshot
app.post('/api/config/restore', async (req, res) => {
	try {
		const { file } = req.body;
		if (!file) return res.status(400).json({ error: 'file required' });
		const snapPath = path.join(SNAP_DIR, file);
		const txt = await fs.readFile(snapPath, 'utf-8');
		const parsed = JSON.parse(txt);
		const cfg = parsed.config ?? parsed;
		await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2));
		return res.json({ ok: true, config: cfg });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: String(err) });
	}
});

// ...existing server listen code...
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`mcpServer listening on ${PORT}`);
});
