import { postJSON } from "../utils/http.ts";
import { Logger } from "../lib/logger.ts";

export class MCPClient {
    constructor(private serverUrl: string) { }

    async call(method: string, params: any = {}) {
        try {
            const payload = {
                jsonrpc: "2.0",
                method,
                params,
                id: Date.now()
            };

            const response = await postJSON(this.serverUrl, payload);
            return response;
        } catch (err: any) {
            Logger.error("Error en MCPClient", { err: err.message, method });
            throw err;
        }
    }
}
