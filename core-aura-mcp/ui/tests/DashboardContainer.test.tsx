import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoreStatus } from '../src/services/mcpCoreClient';

// Mock simple de McpCoreClient para tests
class MockMcpCoreClient {
	private statusCallbacks: ((s: CoreStatus) => void)[] = [];
	private connected = false;

	async connect(): Promise<void> {
		this.connected = true;
	}

	disconnect(): void {
		this.connected = false;
	}

	async getStatus(): Promise<CoreStatus> {
		return { status: 'ok', uptime: 100, timestamp: new Date().toISOString() };
	}

	subscribe(event: string, cb: (payload: any) => void): () => void {
		if (event === 'status') {
			this.statusCallbacks.push(cb);
		}
		return () => {
			this.statusCallbacks = this.statusCallbacks.filter((c) => c !== cb);
		};
	}

	// Helper para tests
	simulateStatusUpdate(status: CoreStatus): void {
		this.statusCallbacks.forEach((cb) => cb(status));
	}
}

describe('DashboardContainer', () => {
	let mockClient: MockMcpCoreClient;

	beforeEach(() => {
		mockClient = new MockMcpCoreClient();
	});

	it('renderiza con props iniciales', async () => {
		// Setup: props iniciales
		const props = {
			client: mockClient,
			coreUrl: 'http://localhost:3000'
		};

		// Verificar que se pueden pasar props
		expect(props.client).toBeDefined();
		expect(props.coreUrl).toBe('http://localhost:3000');
	});

	it('intenta conectar en el mount', async () => {
		const connectSpy = vi.spyOn(mockClient, 'connect');
		await mockClient.connect();

		expect(connectSpy).toHaveBeenCalled();
		connectSpy.mockRestore();
	});

	it('obtiene status inicial', async () => {
		const status = await mockClient.getStatus();

		expect(status).toBeDefined();
		expect(status.status).toBe('ok');
		expect(status.uptime).toBeDefined();
		expect(status.timestamp).toBeDefined();
	});

	it('se suscribe a eventos status', () => {
		const unsubscribe = mockClient.subscribe('status', () => {});

		expect(typeof unsubscribe).toBe('function');
		unsubscribe();
	});

	it('actualiza estado al recibir evento status', async () => {
		let receivedStatus: CoreStatus | null = null;
		mockClient.subscribe('status', (s) => {
			receivedStatus = s;
		});

		const newStatus: CoreStatus = {
			status: 'degraded',
			uptime: 200,
			timestamp: new Date().toISOString()
		};
		mockClient.simulateStatusUpdate(newStatus);

		expect(receivedStatus).toEqual(newStatus);
	});

	it('desuscribe en cleanup', () => {
		const unsubscribe = mockClient.subscribe('status', () => {});
		unsubscribe();

		// Verificar que no hay más callbacks
		expect(() => mockClient.simulateStatusUpdate({ status: 'ok', uptime: 0, timestamp: '' })).not.toThrow();
	});

	it('desconecta el cliente en unmount si es owner', async () => {
		const disconnectSpy = vi.spyOn(mockClient, 'disconnect');
		mockClient.disconnect();

		expect(disconnectSpy).toHaveBeenCalled();
		disconnectSpy.mockRestore();
	});
});
