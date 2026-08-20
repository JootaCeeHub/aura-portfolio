import { Tool } from "langchain/tools";
import { MCPCoreClient } from "./mcpCoreClient.js";

/**
 * Tool genérica que envuelve la llamada a core.route_intent.
 * El modelo puede enviar una descripción de lo que quiere hacer (intent)
 * y el nombre de la herramienta específica del módulo objetivo.
 */
export class MCPRouteIntentTool extends Tool {
    name = "aura_mcp_route_intent";
    description = `
  Orquesta llamadas a módulos MCP a través del AURA-MCP-Core.
  Úsalo cuando necesites ejecutar una herramienta en un módulo específico,
  pero quieras que el core decida a qué servidor dirigir la petición.
  Entrada: JSON string con { "intent": string, "tool": string, "args": object }.
  `;

    private mcpClient: MCPCoreClient;

    constructor(mcpClient: MCPCoreClient) {
        super();
        this.mcpClient = mcpClient;
    }

    async _call(input: string): Promise<string> {
        let parsed: { intent: string; tool: string; args?: any };

        try {
            parsed = JSON.parse(input);
        } catch (err) {
            throw new Error(
                `Entrada inválida para aura_mcp_route_intent. Debe ser JSON string con { "intent", "tool", "args?" }. Error: ${err}`
            );
        }

        const { intent, tool, args = {} } = parsed;

        const result = await this.mcpClient.routeIntent(intent, tool, args);
        return JSON.stringify(result);
    }
}

/**
 * Tool auxiliar para inspeccionar el estado del core y ver módulos disponibles.
 */
export class MCPListServersTool extends Tool {
    name = "aura_mcp_list_servers";
    description = `
  Lista todos los módulos MCP registrados en el AURA-MCP-Core.
  No requiere entrada. Úsalo para entender qué capacidades MCP están disponibles.
  `;

    private mcpClient: MCPCoreClient;

    constructor(mcpClient: MCPCoreClient) {
        super();
        this.mcpClient = mcpClient;
    }

    async _call(_: string): Promise<string> {
        const result = await this.mcpClient.listServers();
        return JSON.stringify(result, null, 2);
    }
}
