// Types usados por la UI (ajustar según contrato real del Core)
export type CoreStatus = {
  status: 'ok' | 'degraded' | 'down';
  uptime?: number;
  timestamp?: string;
  [key: string]: any;
};

export type McpModuleInfo = { name: string; version?: string; healthy?: boolean; [k: string]: any };
export type LogEntry = { timestamp: string; level?: string; message: string; [k: string]: any };

type ListenerFn = (payload: any) => void;

export interface McpCoreClientOptions {
  pollingIntervalMs?: number;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
  fetchTimeoutMs?: number;
  onLog?: (msg: string, meta?: any) => void;
  webSocketFactory?: (url: string) => WebSocket;
  fetchImpl?: typeof fetch;
}

export class McpCoreClient {
  private static _instance?: McpCoreClient;
  static getInstance(baseUrl?: string, opts?: McpCoreClientOptions) {
    if (!this._instance) {
      if (!baseUrl)
        throw new Error('McpCoreClient.getInstance requires baseUrl for first initialization');
      this._instance = new McpCoreClient(baseUrl, opts);
    }
    return this._instance;
  }

  private baseUrl: string;
  private socket: WebSocket | null = null;
  private webSocketFactory?: (url: string) => WebSocket;
  private listeners: Map<string, Set<ListenerFn>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pollingTimer: number | null = null;
  private stopped = false;
  private lastSeenLogTimestamp?: string;
  private options: Required<McpCoreClientOptions>;
  private fetchImpl?: typeof fetch;

  constructor(baseUrl: string, options?: McpCoreClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.options = {
      pollingIntervalMs: options?.pollingIntervalMs ?? 5000,
      reconnectInitialDelayMs: options?.reconnectInitialDelayMs ?? 500,
      reconnectMaxDelayMs: options?.reconnectMaxDelayMs ?? 30_000,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? Infinity,
      heartbeatIntervalMs: options?.heartbeatIntervalMs ?? 15_000,
      fetchTimeoutMs: options?.fetchTimeoutMs ?? 8_000,
      onLog: options?.onLog ?? (() => {}),
      webSocketFactory: options?.webSocketFactory as any,
      fetchImpl:
        options?.fetchImpl ??
        (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as any)),
    };
    this.webSocketFactory = options?.webSocketFactory;
    this.fetchImpl =
      options?.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
  }

  private log(level: string, message: string, meta?: any) {
    this.options.onLog(message, { level, ...meta });
  }

  async connect(): Promise<void> {
    this.log('info', 'connect.start', { baseUrl: this.baseUrl });
    this.stopped = false;
    try {
      await this.openWebSocket();
      this.log('info', 'connect.ready');
    } catch (err) {
      this.log('warn', 'connect.ws_failed', { error: String(err) });
      this.startPolling();
      throw err;
    }
  }

  disconnect(): void {
    this.stopped = true;
    if (this.socket) {
      try {
        this.socket.close(1000, 'client disconnect');
      } catch {
        // ignore
      }
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPolling();
    this.clearHeartbeat();
  }

  async send(event: string, payload: any): Promise<void> {
    const message = JSON.stringify({ event, payload });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      return;
    }
    await this.postJson('/api/events', { event, payload });
  }

  async getStatus(): Promise<CoreStatus> {
    return this.fetchJson<CoreStatus>('/api/status');
  }

  async listModules(): Promise<McpModuleInfo[]> {
    return this.fetchJson<McpModuleInfo[]>('/api/modules');
  }

  // Public: obtener logs (opcional desde timestamp). Útil para carga inicial en UI.
  async getLogs(since?: string): Promise<LogEntry[]> {
    try {
      const path = '/api/logs' + (since ? `?since=${encodeURIComponent(since)}` : '');
      const logs = await this.fetchJson<LogEntry[]>(path);
      // actualizar puntero interno si hay nuevos logs
      if (Array.isArray(logs) && logs.length) {
        this.lastSeenLogTimestamp = logs[logs.length - 1].timestamp ?? this.lastSeenLogTimestamp;
      }
      return logs;
    } catch (err) {
      // re-lanzar para que el consumidor decida; registrar localmente
      this.log('warn', 'getLogs.error', { err: String(err) });
      throw err;
    }
  }

  subscribe(event: string, cb: ListenerFn): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.unsubscribe(event, cb);
  }

  unsubscribe(event: string, cb?: ListenerFn) {
    if (!this.listeners.has(event)) return;
    if (!cb) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)!.delete(cb);
    if (this.listeners.get(event)!.size === 0) this.listeners.delete(event);
  }

  // Internal
  private openWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.createWsUrl();
      this.log('info', 'mcpClient.ws.connecting', { wsUrl });
      let resolved = false;
      try {
        const socket = this.webSocketFactory ? this.webSocketFactory(wsUrl) : new WebSocket(wsUrl);
        this.socket = socket;

        const onOpen = () => {
          // capture attempt count before reset
          const attempt = this.reconnectAttempts;
          this.reconnectAttempts = 0;
          this.clearReconnectTimer();
          this.stopPolling();
          this.setupHeartbeat();

          // Emitir eventos para UI
          if (attempt > 0) {
            this.emit('ws.reconnected', { attempt });
          } else {
            this.emit('ws.connected', {});
          }

          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        const onError = (ev: any) => {
          this.log('error', 'mcpClient.ws.error', { err: ev?.message ?? ev });
          this.emit('ws.error', { err: ev?.message ?? ev });
          if (!resolved) {
            resolved = true;
            reject(new Error('WebSocket error'));
          }
        };

        const onClose = (ev: any) => {
          this.socket = null;
          this.clearHeartbeat();
          this.emit('ws.disconnected', { code: ev?.code, reason: ev?.reason });
          if (!this.stopped) {
            this.scheduleReconnect();
            this.startPolling();
          }
        };

        const onMessage = (ev: any) => {
          this.handleWsMessage(ev.data);
        };

        socket.addEventListener('open', onOpen);
        socket.addEventListener('error', onError);
        socket.addEventListener('close', onClose);
        socket.addEventListener('message', onMessage);

        window.setTimeout(() => {
          if (!resolved) {
            this.log('warn', 'mcpClient.ws.open_timeout');
            try {
              socket.close();
            } catch {
              // ignore
            }
            if (!resolved) {
              resolved = true;
              reject(new Error('WebSocket open timeout'));
            }
          }
        }, 8000);
      } catch (err) {
        this.log('error', 'mcpClient.ws.construct_error', { error: String(err) });
        reject(err);
      }
    });
  }

  private handleWsMessage(raw: any) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const event = data.event ?? data.type ?? 'message';
      const payload = data.payload ?? data;
      this.emit(event, payload);
    } catch (err) {
      this.log('error', 'ws.parse_error', { err: String(err), raw });
    }
  }

  private emit(event: string, payload: any) {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of Array.from(set)) {
        try {
          cb(payload);
        } catch (err) {
          this.log('error', 'listener.error', { event, err: String(err) });
        }
      }
    }
  }

  private createWsUrl(): string {
    if (/^wss?:\/\//.test(this.baseUrl)) return this.baseUrl;
    if (/^https:\/\//.test(this.baseUrl)) return this.baseUrl.replace(/^https/, 'wss') + '/ws';
    if (/^http:\/\//.test(this.baseUrl)) return this.baseUrl.replace(/^http/, 'ws') + '/ws';
    return `ws://${this.baseUrl}/ws`;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.stopped) return;
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.options.maxReconnectAttempts) {
      this.log('error', 'mcpClient.ws.max_reconnect_exceeded', {
        attempts: this.reconnectAttempts,
      });
      this.emit('ws.reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }
    const delay = Math.min(
      this.options.reconnectInitialDelayMs * 2 ** (this.reconnectAttempts - 1),
      this.options.reconnectMaxDelayMs
    );

    // Emitir intento de reconexión (UI puede mostrar toast)
    this.emit('ws.reconnect_attempt', { attempt: this.reconnectAttempts, delay });

    this.log('info', 'mcpClient.ws.reconnect_scheduled', {
      delay,
      attempt: this.reconnectAttempts,
    });
    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.stopped) return;
      try {
        await this.openWebSocket();
        this.log('info', 'mcpClient.ws.reconnected');
        // openWebSocket emite 'ws.reconnected' al abrir si attempt>0
      } catch (err) {
        this.log('warn', 'mcpClient.ws.reconnect_failed', { err: String(err) });
        this.emit('ws.reconnect_failed', { err: String(err), attempt: this.reconnectAttempts });
        this.scheduleReconnect();
      }
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private heartbeatTimer: number | null = null;
  private setupHeartbeat() {
    this.clearHeartbeat();
    if (!this.socket) return;
    this.heartbeatTimer = window.setInterval(() => {
      try {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ event: 'ping' }));
        }
      } catch {
        // ignore
      }
    }, this.options.heartbeatIntervalMs);
  }
  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startPolling() {
    if (this.pollingTimer || this.stopped) return;
    this.pollingTimer = window.setInterval(async () => {
      try {
        await this.fetchJson('/api/status');
      } catch (err) {
        this.log('warn', 'polling.status_error', { error: String(err) });
      }
    }, this.options.pollingIntervalMs);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async fetchJson<T = any>(path: string, opts?: RequestInit): Promise<T> {
    const url = this.baseUrl + path;
    this.log('debug', 'http.fetch', { url, opts });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.fetchTimeoutMs);
    try {
      const response = await this.fetchImpl!(url, { ...opts, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return (await response.json()) as T;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw new Error('fetch timeout');
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async postJson<T = any>(path: string, body: any, opts?: RequestInit): Promise<T> {
    const url = this.baseUrl + path;
    this.log('debug', 'http.post', { url, body, opts });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.fetchTimeoutMs);
    try {
      const response = await this.fetchImpl!(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        ...opts,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return (await response.json()) as T;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw new Error('fetch timeout');
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
