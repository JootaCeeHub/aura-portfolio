import { promises as fs } from 'fs';
import path from 'path';
import { Config } from './config.js';
import { Logger } from './logger.js';

export interface MCPRegistryEntry {
  name: string;
  url: string;
  scopes: string[];
  status?: string;
}

export class Registry {
  static async load(): Promise<MCPRegistryEntry[]> {
    const candidates = [
      Config.registryPath,
      // Fallback: raíz del repo ../config/mcp-registry.json
      // cuando se ejecuta dentro de core-aura-mcp
      path.resolve(process.cwd(), '../config/mcp-registry.json'),
    ];

    for (const p of candidates) {
      try {
        const raw = await fs.readFile(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          throw new Error('mcp-registry.json debe ser un array.');
        }
        return parsed;
      } catch {
        // Intentar siguiente candidato
        continue;
      }
    }
    Logger.error('Error cargando mcp-registry.json', { reason: 'No se encontró en rutas conocidas' });
    return [];
  }

  static async list(): Promise<MCPRegistryEntry[]> {
    return this.load();
  }

  static async findByName(name: string): Promise<MCPRegistryEntry | undefined> {
    const list = await this.load();
    return list.find((m) => m.name === name);
  }

  static async callModule(module: MCPRegistryEntry, payload: any): Promise<any> {
    try {
      const response = await fetch(module.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${module.name}`);
      }
      const data = await response.json();
      return data.result;
    } catch (err: any) {
      Logger.error(`Error calling module ${module.name}`, err.message);
      throw err;
    }
  }
}

export default Registry;

