import axios from "axios";

export interface MCPRegistryEntry {
    name: string;
    url: string;
    scopes: string[];
    status?: string;
}

export interface MCPCoreConfig {
    coreUrl: string; // ej: http://localhost:3000
}

/**
 * Cliente de alto nivel para interactuar con el AURA-MCP-Core.
 * Encapsula llamadas JSON-RPC y herramientas expuestas por el core.
 */
export class MCPCoreClient {
    private coreUrl: string;

    constructor(config: MCPCoreConfig) {
        this.coreUrl = config.coreUrl.replace(/\/+$/, "");
    }

    private async callCore(method: string, params: any = {}): Promise<any> {
        const payload = {
            jsonrpc: "2.0",
            method,
            params,
            id: Date.now()
        };

        const response = await axios.post(this.coreUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                Authorization: process.env.MCP_CORE_TOKEN ? `Bearer ${process.env.MCP_CORE_TOKEN}` : undefined
            },
            timeout: 15_000
        });

        if (response.data.error) {
            throw new Error(
                `Error desde AURA-MCP-Core: ${response.data.error.message || response.data.error}`
            );
        }

        return response.data.result ?? response.data;
    }

    /** Llama a core.get_status */
    async getStatus() {
        return this.callCore("core.get_status", {});
    }

    /** Llama a core.list_servers */
    async listServers(): Promise<{ servers: MCPRegistryEntry[] }> {
        return this.callCore("core.list_servers", {});
    }

    /** Llama a core.route_tool (ruteo explícito por nombre de servidor) */
    async routeTool(
        serverName: string,
        tool: string,
        args: any = {}
    ): Promise<any> {
        return this.callCore("core.route_tool", {
            server: serverName,
            tool,
            args
        });
    }

    /** Llama a core.route_intent (ruteo inteligente según intención + tool) */
    async routeIntent(
        intent: string,
        tool: string,
        args: any = {}
    ): Promise<any> {
        return this.callCore("core.route_intent", { intent, tool, args });
    }
}
