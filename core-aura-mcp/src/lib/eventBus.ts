import { EventEmitter } from 'events';

import { Logger } from './logger.js';

/**
 * Eventos del dominio.
 */
export type DomainEvent =
	| {
			type: 'AgentExecutionStarted';
			agentId: string;
			taskId: string;
			input: string;
			timestamp: number;
			correlationId?: string;
	  }
	| {
			type: 'AgentExecutionCompleted';
			agentId: string;
			taskId: string;
			output: string;
			latencyMs: number;
			success: boolean;
			timestamp: number;
			correlationId?: string;
	  }
	| {
			type: 'AgentExecutionFailed';
			agentId: string;
			taskId: string;
			error: string;
			latencyMs: number;
			timestamp: number;
			correlationId?: string;
	  }
	| {
			type: 'TokenGenerated';
			agentId: string;
			tokenId: string;
			expiresAt: number;
			timestamp: number;
	  }
	| {
			type: 'TokenRevoked';
			tokenId: string;
			timestamp: number;
	  }
	| {
			type: 'ToolExecuted';
			toolName: string;
			agentId: string;
			success: boolean;
			latencyMs: number;
			timestamp: number;
			correlationId?: string;
	  };

/**
 * Handler de evento.
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/**
 * Event Bus centralizado para pub/sub de eventos del dominio.
 * Arquitectura event-driven: desacoplamiento de componentes.
 */
export class EventBus {
	private emitter = new EventEmitter();

	private eventLog: DomainEvent[] = [];

	private handlers: Map<string, EventHandler[]> = new Map();

	private maxEventLogSize = 50000;

	constructor() {
		Logger.debug('eventBus.initialized');
	}

	/**
	 * Publicar evento (emit + persist).
	 */
	async publishEvent(event: DomainEvent): Promise<void> {
		try {
			// Persistir en log
			this.eventLog.push(event);
			if (this.eventLog.length > this.maxEventLogSize) {
				this.eventLog.splice(0, Math.floor(this.maxEventLogSize / 10));
			}

			// Emitir a todos los listeners
			this.emitter.emit(event.type, event);

			Logger.debug('eventBus.event.published', {
				eventType: event.type,
				timestamp: event.timestamp,
			});
		} catch (err) {
			Logger.error('eventBus.event.publish_failed', {
				eventType: event.type,
				error: (err as Error).message,
			});
			throw err;
		}
	}

	/**
	 * Suscribirse a tipo de evento específico.
	 */
	subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): () => void {
		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, []);
		}

		this.handlers.get(eventType)!.push(handler as EventHandler);
		this.emitter.on(eventType, handler);

		Logger.debug('eventBus.subscriber.added', { eventType });

		// Retornar función de unsubscribe
		return () => {
			const handlers = this.handlers.get(eventType);
			if (handlers) {
				const idx = handlers.indexOf(handler as EventHandler);
				if (idx !== -1) handlers.splice(idx, 1);
			}
			this.emitter.off(eventType, handler);
			Logger.debug('eventBus.subscriber.removed', { eventType });
		};
	}

	/**
	 * Obtener evento log completo.
	 */
	getEventLog(since?: number): DomainEvent[] {
		if (!since) return this.eventLog.slice();
		return this.eventLog.filter((e) => e.timestamp >= since);
	}

	/**
	 * Obtener eventos por tipo.
	 */
	getEventsByType(eventType: string): DomainEvent[] {
		return this.eventLog.filter((e) => e.type === eventType);
	}

	/**
	 * Obtener eventos por agente.
	 */
	getEventsByAgent(agentId: string): DomainEvent[] {
		return this.eventLog.filter((e) => 'agentId' in e && (e as any).agentId === agentId);
	}

	/**
	 * Obtener eventos por correlationId.
	 */
	getEventsByCorrelationId(correlationId: string): DomainEvent[] {
		return this.eventLog.filter((e) => 'correlationId' in e && (e as any).correlationId === correlationId);
	}

	/**
	 * Reset.
	 */
	reset(): void {
		this.eventLog = [];
		this.handlers.clear();
		this.emitter.removeAllListeners();
	}
}

export const eventBus = new EventBus();

