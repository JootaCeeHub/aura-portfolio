import "dotenv/config";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AgentExecutor, initializeAgentExecutorWithOptions } from "langchain/agents";
import { MCPCoreClient } from "./mcpCoreClient.js";
import { MCPListServersTool, MCPRouteIntentTool } from "./mcpCoreTool.js";

/**
 * Configuración del modelo base de AURA.
 * Puedes cambiar el modelo por el que uses realmente (gpt-4.1, gpt-4o, etc.).
 */
const llm = new ChatOpenAI({
    modelName: process.env.AURA_LLM_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    openAIApiKey: process.env.OPENAI_API_KEY
});

/**
 * Cliente hacia el AURA-MCP-Core.
 */
const coreClient = new MCPCoreClient({
    coreUrl: process.env.AURA_MCP_CORE_URL || "http://localhost:3000"
});

/**
 * Tools conectadas al core:
 * - Ver servidores MCP
 * - Orquestar llamadas a herramientas vía intención
 */
const tools = [
    new MCPListServersTool(coreClient),
    new MCPRouteIntentTool(coreClient)
];

/**
 * Prompt base del agente AURA.
 * Aquí puedes integrar reglas del "Prompt System Filtrados" y del "MCP Orquestador Personal".
 */
const SYSTEM_PROMPT = `
Eres AURA, un agente orquestador experto que trabaja sobre un ecosistema de módulos MCP.
Debes:
- Entender la intención del usuario.
- Decidir cuándo llamar a herramientas MCP a través del AURA-MCP-Core.
- Usar "aura_mcp_list_servers" para conocer módulos disponibles cuando sea necesario.
- Usar "aura_mcp_route_intent" para ejecutar herramientas específicas en módulos MCP.

Políticas clave:
- Respeta las restricciones de seguridad y contenido definidas por el sistema.
- Si la petición del usuario es peligrosa, ilegal o viola políticas, debes rechazarla.
- Cuando llames "aura_mcp_route_intent", describe bien el intent y el tool objetivo (ej: "n8n.run_workflow", "excel.read_range", etc.).
`;

/**
 * Crea el agente AURA usando LangChain.
 */
async function createAuraAgent(): Promise<AgentExecutor> {
    const executor = await initializeAgentExecutorWithOptions(
        tools,
        llm,
        {
            agentType: "openai-functions",
            verbose: true,
            agentArgs: {
                systemMessage: SYSTEM_PROMPT
            }
        }
    );

    return executor;
}

/**
 * Ejemplo de ejecución de AURA en modo CLI.
 * Puedes probarlo con:  npm run start  (desde clients/aura-langchain)
 */
async function main() {
    const agent = await createAuraAgent();

    console.log("AURA LangChain Agent listo. Probando consulta...");

    const response = await agent.call({
        input: `
      Quiero saber qué módulos MCP hay disponibles en el ecosistema.
      Llama a la herramienta adecuada para listarlos y muéstrame el resultado.
    `
    });

    console.log("\n🔹 Respuesta del agente AURA:");
    console.dir(response, { depth: null });
}

main().catch((err) => {
    console.error("Error ejecutando el agente AURA:", err);
    process.exit(1);
});
