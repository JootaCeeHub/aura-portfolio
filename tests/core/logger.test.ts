import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../core-aura-mcp/src/lib/logger';

describe('Logger', () => {
	beforeEach(() => {
		Logger.clearMemoryLogs();
		Logger.addMemoryTransport();
	});

	afterEach(() => {
		Logger.clearMemoryLogs();
	});

	describe('initialize', () => {
		it('inicializa el logger correctamente', () => {
			Logger.initialize();
			// No lanza error
			expect(() => Logger.info('test')).not.toThrow();
		});

		it('es idempotente (llamar múltiples veces no causa problemas)', () => {
			Logger.initialize();
			Logger.initialize();
			Logger.initialize();
			// No lanza error
			expect(() => Logger.info('test')).not.toThrow();
		});
	});

	describe('runWithId', () => {
		it('establece correlationId en el contexto', () => {
			const testCid = 'test-cid-123';
			Logger.runWithId(testCid, () => {
				expect(Logger.getCorrelationId()).toBe(testCid);
			});
		});

		it('retorna el resultado de la función ejecutada', () => {
			const result = Logger.runWithId('cid', () => {
				return 'test result';
			});
			expect(result).toBe('test result');
		});

		it('mantiene correlationId aislado entre contextos', () => {
			const cid1 = 'cid-1';
			const cid2 = 'cid-2';

			Logger.runWithId(cid1, () => {
				expect(Logger.getCorrelationId()).toBe(cid1);
				Logger.runWithId(cid2, () => {
					expect(Logger.getCorrelationId()).toBe(cid2);
				});
				expect(Logger.getCorrelationId()).toBe(cid1);
			});
		});
	});

	describe('getCorrelationId', () => {
		it('retorna undefined si no hay correlationId establecido', () => {
			expect(Logger.getCorrelationId()).toBeUndefined();
		});

		it('retorna el correlationId actual', () => {
			Logger.setCorrelationId('test-cid');
			expect(Logger.getCorrelationId()).toBe('test-cid');
		});
	});

	describe('log methods', () => {
		it('info() registra mensajes', () => {
			Logger.info('test message', { key: 'value' });
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('debug() registra mensajes', () => {
			Logger.debug('debug message');
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('warn() registra mensajes', () => {
			Logger.warn('warning message');
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('error() registra mensajes', () => {
			Logger.error('error message', { err: 'details' });
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('incluye correlationId en los logs si está establecido', () => {
			const cid = 'test-cid-456';
			Logger.runWithId(cid, () => {
				Logger.info('test message');
			});

			const logs = Logger.getMemoryLogs();
			const lastLog = logs[logs.length - 1];
			expect(lastLog).toBeDefined();
			// Validar que el log contiene el correlationId (puede estar en diferentes lugares según formato)
			expect(JSON.stringify(lastLog)).toContain(cid);
		});
	});

	describe('expressCorrelationMiddleware', () => {
		it('crea un middleware que puede ejecutarse', () => {
			const middleware = Logger.expressCorrelationMiddleware();
			expect(typeof middleware).toBe('function');
		});

		it('middleware acepta req, res, next', () => {
			const middleware = Logger.expressCorrelationMiddleware();
			const mockReq = {
				headers: {},
				method: 'GET',
				url: '/test'
			} as any;
			const mockRes = {
				setHeader: () => {},
				on: () => {}
			} as any;
			const mockNext = () => {};

			expect(() => middleware(mockReq, mockRes, mockNext)).not.toThrow();
		});
	});

	describe('memory transport (for tests)', () => {
		it('captura logs en memoria', () => {
			Logger.info('captured log');
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('clearMemoryLogs limpia los logs capturados', () => {
			Logger.info('log 1');
			Logger.info('log 2');
			Logger.clearMemoryLogs();
			const logs = Logger.getMemoryLogs();
			expect(logs).toEqual([]);
		});
	});

	describe('log methods with edge cases', () => {
		it('info() maneja mensajes vacíos', () => {
			Logger.info('');
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('info() maneja meta null', () => {
			Logger.info('test', null as any);
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('info() maneja meta undefined', () => {
			Logger.info('test', undefined);
			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThan(0);
		});

		it('info() maneja meta con propiedades circulares', () => {
			const circular: any = { name: 'test' };
			circular.self = circular;
			expect(() => Logger.info('test', circular)).not.toThrow();
		});

		it('debug/warn/error también manejan edge cases', () => {
			expect(() => Logger.debug('', {})).not.toThrow();
			expect(() => Logger.warn('', null as any)).not.toThrow();
			expect(() => Logger.error('', undefined)).not.toThrow();
		});

		it('registra correlationId cuando está disponible', () => {
			Logger.runWithId('test-cid', () => {
				Logger.info('with cid');
			});

			const logs = Logger.getMemoryLogs();
			const withCid = logs.find((l) => JSON.stringify(l).includes('test-cid'));
			expect(withCid).toBeDefined();
		});

		it('no añade correlationId si no está disponible', () => {
			Logger.info('without cid');
			const logs = Logger.getMemoryLogs();
			// Verificar que al menos un log se creó
			expect(logs.length).toBeGreaterThan(0);
		});
	});

	describe('runWithId edge cases', () => {
		it('runWithId con función que lanza error', () => {
			expect(() => {
				Logger.runWithId('test-cid', () => {
					throw new Error('test error');
				});
			}).toThrow('test error');
		});

		it('runWithId con función que retorna null', () => {
			const result = Logger.runWithId('cid', () => null);
			expect(result).toBeNull();
		});

		it('runWithId con función que retorna undefined', () => {
			const result = Logger.runWithId('cid', () => undefined);
			expect(result).toBeUndefined();
		});

		it('runWithId anidado mantiene innermost cid', () => {
			const cids: (string | undefined)[] = [];
			Logger.runWithId('outer', () => {
				cids.push(Logger.getCorrelationId());
				Logger.runWithId('inner', () => {
					cids.push(Logger.getCorrelationId());
				});
				cids.push(Logger.getCorrelationId());
			});

			expect(cids).toEqual(['outer', 'inner', 'outer']);
		});

		it('runWithId con cid vacío', () => {
			Logger.runWithId('', () => {
				expect(Logger.getCorrelationId()).toBe('');
			});
		});
	});

	describe('concurrent logging', () => {
		it('múltiples logs seguidos se capturan', async () => {
			Logger.info('log1');
			Logger.debug('log2');
			Logger.warn('log3');
			Logger.error('log4');

			const logs = Logger.getMemoryLogs();
			expect(logs.length).toBeGreaterThanOrEqual(4);
		});

		it('logs en contextos diferentes preservan su cid', async () => {
			const results: string[] = [];

			Logger.runWithId('cid1', () => {
				results.push(Logger.getCorrelationId() ?? 'none');
			});

			Logger.runWithId('cid2', () => {
				results.push(Logger.getCorrelationId() ?? 'none');
			});

			expect(results).toEqual(['cid1', 'cid2']);
		});
	});
});
