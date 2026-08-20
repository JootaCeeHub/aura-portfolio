import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const CONFIG_PATH = process.env.AURA_CONFIG_PATH || path.join(process.cwd(), 'core-aura-mcp', 'config', 'config.json');
const SNAPSHOT_DIR = process.env.AURA_CONFIG_SNAPSHOTS || path.join(process.cwd(), 'core-aura-mcp', 'config', 'backups');

export const configEvents = new EventEmitter();

let inMemory: any = null;

export const configService = {
  async load() {
    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
      inMemory = JSON.parse(raw);
      return inMemory;
    } catch (err) {
      return null;
    }
  },

  getConfig() {
    return inMemory;
  },

  async save(cfg: any, user = 'system') {
    // ensure snapshot dir
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
    // create snapshot of current
    try {
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      const id = `${now}`;
      const snapshotPath = path.join(SNAPSHOT_DIR, `${id}.json`);
      const current = inMemory ?? {};
      await fs.writeFile(snapshotPath, JSON.stringify({ meta: { createdAt: new Date().toISOString(), createdBy: user }, config: current }, null, 2), 'utf-8');
    } catch (e) {
      // ignore snapshot errors
    }

    // write new config
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    inMemory = cfg;
    // emit event
    configEvents.emit('config-updated', { config: cfg, changedBy: user, timestamp: new Date().toISOString() });
  },

  async listSnapshots() {
    try {
      const files = await fs.readdir(SNAPSHOT_DIR);
      const list = [] as any[];
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const p = path.join(SNAPSHOT_DIR, f);
        const raw = await fs.readFile(p, 'utf-8');
        const json = JSON.parse(raw);
        list.push({ file: f, createdAt: json.meta?.createdAt ?? 'unknown', createdBy: json.meta?.createdBy ?? 'unknown' });
      }
      // sort desc
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return list;
    } catch (err) {
      return [];
    }
  },

  async restore(file: string) {
    const p = path.join(SNAPSHOT_DIR, file);
    const raw = await fs.readFile(p, 'utf-8');
    const json = JSON.parse(raw);
    const cfg = json.config ?? json;
    // create backup of current
    try {
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(SNAPSHOT_DIR, `restore-backup-${now}.json`);
      await fs.writeFile(backupPath, JSON.stringify({ meta: { createdAt: new Date().toISOString(), createdBy: 'restore' }, config: inMemory ?? {} }, null, 2), 'utf-8');
    } catch (e) {}
    // write restored
    await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    inMemory = cfg;
    configEvents.emit('config-updated', { config: cfg, changedBy: 'restore', timestamp: new Date().toISOString() });
    return cfg;
  }
};

export default configService;
