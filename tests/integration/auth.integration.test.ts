import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { startServer } from '../../core-aura-mcp/src/mcpServer';

describe('Auth integration', () => {
	let serv: any;

	beforeAll(async () => {
		process.env.JWT_SECRET = 'test-secret-min-32-chars-long!';
		serv = await startServer({ port: 0, enableWs: true });
	});

	afterAll(async () => {
		await serv.close();
		delete process.env.JWT_SECRET;
	});

	it('genera token vía POST /api/auth/token', async () => {
		const res = await request(serv.server)
			.post('/api/auth/token')
			.send({
				agentId: 'test-agent',
				scope: ['logs', 'events'],
				role: 'user'
			})
			.expect(200);

		expect(res.body.token).toBeDefined();
		expect(typeof res.body.token).toBe('string');
	});

	it('accede a /api/logs con token válido', async () => {
		const tokenRes = await request(serv.server)
			.post('/api/auth/token')
			.send({ agentId: 'test-agent', scope: ['logs'] });

		const token = tokenRes.body.token;

		const logsRes = await request(serv.server)
			.get('/api/logs')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		expect(Array.isArray(logsRes.body)).toBe(true);
	});

	it('deniega /api/logs sin token', async () => {
		const res = await request(serv.server).get('/api/logs').expect(401);
		expect(res.body.error).toBeDefined();
	});

	it('deniega /api/logs con token sin scope', async () => {
		const tokenRes = await request(serv.server)
			.post('/api/auth/token')
			.send({ agentId: 'test-agent', scope: ['events'] }); // sin 'logs'

		const token = tokenRes.body.token;
		const res = await request(serv.server)
			.get('/api/logs')
			.set('Authorization', `Bearer ${token}`)
			.expect(403);

		expect(res.body.error).toContain('denegado');
	});

	it('revoca token vía POST /api/auth/revoke', async () => {
		const tokenRes = await request(serv.server)
			.post('/api/auth/token')
			.send({ agentId: 'test-agent', scope: ['logs'] });

		const token = tokenRes.body.token;

		// Usar token para acceder (OK)
		await request(serv.server)
			.get('/api/logs')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		// Revocar
		await request(serv.server)
			.post('/api/auth/revoke')
			.set('Authorization', `Bearer ${token}`)
			.send({ token })
			.expect(200);

		// Intentar usar token revocado
		await request(serv.server)
			.get('/api/logs')
			.set('Authorization', `Bearer ${token}`)
			.expect(401); // Ahora falla
	});

	it('respeta rate limiting en POST /api/auth/token', async () => {
		// Hacer 11 intentos rápidamente
		for (let i = 0; i < 11; i++) {
			const res = await request(serv.server)
				.post('/api/auth/token')
				.send({ agentId: `agent-${i}`, scope: ['logs'] });

			if (i < 10) {
				expect(res.status).toBe(200);
			} else {
				expect(res.status).toBe(429); // Rate limited
			}
		}
	});
});
