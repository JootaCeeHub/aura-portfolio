/* eslint-disable */
import axios from 'axios';
import { CORE_URL } from '../src/config/coreConfig';

export interface McpModuleInfo {
  name: string;
  url: string;
  scopes?: string[];
}

export interface CoreStatus {
  ok: boolean;
  timestamp: string;
  modules: McpModuleInfo[];
}

export interface HealthStatus {
  status: string;
  uptime?: number;
  cpuLoad?: any;
  memoryUsage?: any;
}

// Create a configured axios instance
export const api = axios.create({
  baseURL: CORE_URL, // Initial default, updated dynamically
  timeout: 8000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error('Acceso prohibido al CORE (403)');
    }
    return Promise.reject(error);
  }
);

// Fix: Use import.meta.env for Vite instead of process.env
const ENV_TOKEN = import.meta.env.VITE_MCP_CORE_TOKEN || '';
let CURRENT_CORE_TOKEN = ENV_TOKEN;

export function configureCoreClient(cfg: { url?: string; token?: string }) {
  if (cfg.url) {
    api.defaults.baseURL = cfg.url;
    console.log(`[Client] Base URL updated to: ${cfg.url}`);
  }
  if (cfg.token) {
    CURRENT_CORE_TOKEN = cfg.token;
  }
}

export class McpCoreClient {
  static async call(method: string, params: any = {}): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    };

    const res = await api.post('', payload, {
      headers: {
        Authorization: CURRENT_CORE_TOKEN ? `Bearer ${CURRENT_CORE_TOKEN}` : undefined,
      },
    });
    return res.data;
  }

  static async getStatus(): Promise<CoreStatus> {
    const res = await this.call('core.get_status');
    return res.result as CoreStatus;
  }

  static async listServers(): Promise<McpModuleInfo[]> {
    const res = await this.call('core.list_servers');
    return (res.servers || []) as McpModuleInfo[];
  }
}

export async function checkCoreHealth(): Promise<HealthStatus> {
  const res = await api.get('/health');
  return res.data;
}
