import { database } from './database.js';
import { Logger } from './logger.js';

export interface AuditLogEntry {
	id: string;
	timestamp: number;
	agentId: string;
	action: string;
	resource: string;
	result: 'success' | 'failure';
	metadata: Record<string, any>;
	ipAddress: string;
	userAgent: string;
	correlationId?: string;
}

/**
 * Audit log para compliance (SOC 2, GDPR, ISO 27001).
 * Toda acción crítica queda registrada inmutablemente.
 */
export class AuditLogger {
	private readonly retentionDays = 90; // GDPR: 90 días mínimo

	/**
	 * Registrar acción de auditoría.
	 */
	async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
		try {
			const sql = `
        INSERT INTO audit_logs
        (id, timestamp, agent_id, action, resource, result, metadata, ip_address, user_agent, correlation_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

			const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

			await database.query(sql, [
				id,
				Date.now(),
				entry.agentId,
				entry.action,
				entry.resource,
				entry.result,
				JSON.stringify(entry.metadata),
				entry.ipAddress,
				entry.userAgent,
				entry.correlationId,
			]);

			Logger.debug('auditLog.action.recorded', {
				action: entry.action,
				resource: entry.resource,
				result: entry.result,
			});
		} catch (err) {
			Logger.error('auditLog.action.failed', { error: (err as Error).message });
			// No throw: no bloquear operación si log falla
		}
	}

	/**
	 * Obtener logs de auditoría.
	 */
	async getLogs(
		filters: { agentId?: string; action?: string; startTime?: number; endTime?: number }
	): Promise<AuditLogEntry[]> {
		try {
			let sql = 'SELECT * FROM audit_logs WHERE 1=1';
			const params: any[] = [];

			if (filters.agentId) {
				sql += ` AND agent_id = $${params.length + 1}`;
				params.push(filters.agentId);
			}
			if (filters.action) {
				sql += ` AND action = $${params.length + 1}`;
				params.push(filters.action);
			}
			if (filters.startTime) {
				sql += ` AND timestamp >= $${params.length + 1}`;
				params.push(filters.startTime);
			}
			if (filters.endTime) {
				sql += ` AND timestamp <= $${params.length + 1}`;
				params.push(filters.endTime);
			}

			sql += ' ORDER BY timestamp DESC LIMIT 10000';

			return await database.queryMany<AuditLogEntry>(sql, params);
		} catch (err) {
			Logger.error('auditLog.getLogs.failed', { error: (err as Error).message });
			return [];
		}
	}

	/**
	 * Purgar logs antiguos (GDPR - derecho al olvido).
	 */
	async purgeOldLogs(): Promise<number> {
		try {
			const cutoffTime = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

			const sql = 'DELETE FROM audit_logs WHERE timestamp < $1';
			const result = await database.query(sql, [cutoffTime]);

			Logger.info('auditLog.purged', { rowsDeleted: result.rowCount });

			return result.rowCount ?? 0;
		} catch (err) {
			Logger.error('auditLog.purge.failed', { error: (err as Error).message });
			return 0;
		}
	}

	/**
	 * Exportar logs para auditoría externa (SOC 2).
	 */
	async exportForAudit(startTime: number, endTime: number): Promise<Buffer> {
		const logs = await this.getLogs({ startTime, endTime });

		const csv = [
			['Timestamp', 'Agent', 'Action', 'Resource', 'Result', 'IP', 'Correlation ID'],
			...logs.map((l) => [
				new Date(l.timestamp).toISOString(),
				l.agentId,
				l.action,
				l.resource,
				l.result,
				l.ipAddress,
				l.correlationId || 'N/A',
			]),
		]
			.map((row) => row.join(','))
			.join('\n');

		return Buffer.from(csv, 'utf-8');
	}
}

export const auditLogger = new AuditLogger();

