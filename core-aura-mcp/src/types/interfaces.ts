export interface RouteToolParams {
  server: string;
  tool: string;
  args: Record<string, any>;
}

export interface RouteIntentParams {
  intent: string;
  tool: string;
  args: Record<string, any>;
}

export type MCPToolHandler = (args: any) => Promise<any> | any;
export type MCPResourceHandler = () => Promise<any> | any;

export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: string;
  id: string | number | null;
}
