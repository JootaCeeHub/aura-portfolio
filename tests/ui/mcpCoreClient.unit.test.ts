import { describe, it, expect } from 'vitest';
import { McpCoreClient, CoreStatus } from '../../core-aura-mcp/ui/src/services/mcpCoreClient';

// Fake WebSocket para tests
class FakeWebSocket {
	onopen: (() => void) | null = null;
	onmessage: ((ev: any) => void) | null = null;
	onclose: ((ev?: any) => void) | null = null;
	onerror: ((ev?: any) => void) | null = null;
	readyState = 1;
	constructor(_url: string) {
		setTimeout(() => this.onopen?.(), 0);
	}
	send(_data: any) {}
	close() {
		this.readyState = 3;
		this.onclose?.({ code: 1000 });
	}
	// helper to simulate incoming message
	simulateMessage(obj: any) {
		const data = typeof obj === 'string' ? obj : JSON.stringify(obj);
		this.onmessage?.({ data });
	}
}

describe('McpCoreClient unit', () => {
	it('recibe eventos WS y los emite a listeners', async () => {
		const wsFactory = (url: string) => new FakeWebSocket(url) as unknown as WebSocket;
		const client = new McpCoreClient('http://localhost:1234', { webSocketFactory: wsFactory });

		let receivedStatus: CoreStatus | null = null;
		const unsub = client.subscribe('status', (s) => {
			receivedStatus = s as CoreStatus;
		});

		await client.connect();
		// @ts-ignore acceder al socket fake
		(client as any).socket.simulateMessage({ event: 'status', payload: { status: 'ok', uptime: 1, timestamp: new Date().toISOString() } });

		// dar tiempo al loop async
		await new Promise((r) => setTimeout(r, 20));

		expect(receivedStatus).not.toBeNull();
		expect(receivedStatus!.status).toBe('ok');

		unsub();
		client.disconnect();
	});
});
