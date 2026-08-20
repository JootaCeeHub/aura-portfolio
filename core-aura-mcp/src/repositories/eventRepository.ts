import { database } from '../lib/database.js';
import { Logger } from '../lib/logger.js';
import type { DomainEvent } from '../lib/eventBus.js';

/**
 * Repositorio de eventos (Event Sourcing).
 */
export class EventRepository {
	/**
	 * Persistir evento.
	 */
	async saveEvent(event: DomainEvent): Promise<void> {
		try {
			const sql = `
        INSERT INTO events (event_type, aggregate_id, payload, correlation_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `;

			const aggregateId = (event as any).agentId || (event as any).tokenId || 'unknown';

			await database.query(sql, [event.type, aggregateId, JSON.stringify(event), (event as any).correlationId, {}]);

			Logger.debug('eventRepository.event.saved', { eventType: event.type });
		} catch (err) {
			Logger.error('eventRepository.save.failed', { error: (err as Error).message });
			throw err;
		}
	}

	/**
	 * Obtener eventos por correlationId.
	 */
	async getEventsByCorrelationId(correlationId: string): Promise<DomainEvent[]> {
		try {
			const sql = `SELECT payload FROM events WHERE correlation_id = $1 ORDER BY created_at ASC`;
			const result = await database.queryMany<any>(sql, [correlationId]);
			return result.map((r) => JSON.parse(r.payload));
		} catch (err) {
			Logger.error('eventRepository.getByCorrelation.failed', { error: (err as Error).message });
			return [];
		}
	}

	/**
	 * Obtener eventos por aggregateId.
	 */
	async getEventsByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
		try {
			const sql = `SELECT payload FROM events WHERE aggregate_id = $1 ORDER BY created_at ASC`;
			const result = await database.queryMany<any>(sql, [aggregateId]);
			return result.map((r) => JSON.parse(r.payload));
		} catch (err) {
			Logger.error('eventRepository.getByAggregate.failed', { error: (err as Error).message });
			return [];
		}
	}

	/**
	 * Obtener eventos recientes.
	 */
	async getRecentEvents(limit: number = 100): Promise<DomainEvent[]> {
		try {
			const sql = `SELECT payload FROM events ORDER BY created_at DESC LIMIT $1`;
			const result = await database.queryMany<any>(sql, [limit]);
			return result.map((r) => JSON.parse(r.payload));
		} catch (err) {
			Logger.error('eventRepository.getRecent.failed', { error: (err as Error).message });
			return [];
		}
	}
}

export const eventRepository = new EventRepository();

