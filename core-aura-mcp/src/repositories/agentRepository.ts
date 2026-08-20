import { database } from '../lib/database.js';
import { cache } from '../lib/cache.js';
import { Logger } from '../lib/logger.js';
import type { AgentDefinition } from '../lib/agentFactory.js';

/**
 * Repositorio de agentes con caché en Redis.
 */
export class AgentRepository {
	private cacheKeyPrefix = 'agent:';

	private cacheListKey = 'agents:all';

	private cacheTtl = 3600; // 1 hora

	/**
	 * Obtener agente (con caché).
	 */
	async getAgent(id: string): Promise<AgentDefinition | null> {
		try {
			// Intentar desde caché primero
			const cached = await cache.get<AgentDefinition>(this.cacheKeyPrefix + id);
			if (cached) return cached;

			// Desde DB
			const sql = `SELECT * FROM agents WHERE id = $1`;
			const agent = await database.queryOne<any>(sql, [id]);

			if (agent) {
				await cache.set(this.cacheKeyPrefix + id, agent, this.cacheTtl);
			}

			return agent ?? null;
		} catch (err) {
			Logger.error('agentRepository.get.failed', { id, error: (err as Error).message });
			return null;
		}
	}

	/**
	 * Listar agentes (con caché).
	 */
	async listAgents(enabledOnly: boolean = false): Promise<AgentDefinition[]> {
		try {
			// Intentar desde caché
			const cached = await cache.get<AgentDefinition[]>(this.cacheListKey);
			if (cached) return enabledOnly ? cached.filter((a) => a.enabled) : cached;

			// Desde DB
			const sql = `SELECT * FROM agents${enabledOnly ? ' WHERE enabled = true' : ''}`;
			const agents = await database.queryMany<AgentDefinition>(sql);

			// Cachear
			await cache.set(this.cacheListKey, agents, this.cacheTtl);

			return agents;
		} catch (err) {
			Logger.error('agentRepository.list.failed', { error: (err as Error).message });
			return [];
		}
	}

	/**
	 * Guardar agente (invalida caché).
	 */
	async saveAgent(agent: AgentDefinition): Promise<void> {
		try {
			const sql = `
        INSERT INTO agents (id, name, type, persona, mission, tools, version, enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `;

			await database.query(sql, [
				agent.id,
				agent.name,
				agent.type,
				agent.persona,
				agent.mission,
				agent.tools,
				agent.version,
				agent.enabled,
			]);

			// Invalidar caché
			await cache.del(this.cacheKeyPrefix + agent.id);
			await cache.del(this.cacheListKey);

			Logger.debug('agentRepository.agent.saved', { agentId: agent.id });
		} catch (err) {
			Logger.error('agentRepository.save.failed', { error: (err as Error).message });
			throw err;
		}
	}
}

export const agentRepository = new AgentRepository();

