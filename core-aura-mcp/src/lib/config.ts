import path from 'path';

export interface AuraCoreConfig {
  port: number;
  registryPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  openaiKey?: string;
  defaultLLM?: string;
  tavilyApiKey?: string;
  n8nBaseUrl?: string;
  graphitiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  msGraphToken?: string;
  makeApiKey?: string;
  zapierToken?: string;
  githubToken?: string;
}

export const Config: AuraCoreConfig = {
  port: Number(process.env.AURA_MCP_CORE_PORT || 3000),
  registryPath: path.resolve('config/mcp-registry.json'),
  logLevel: (process.env.AURA_LOG_LEVEL as any) || 'info',
  openaiKey: process.env.OPENAI_API_KEY,
  defaultLLM: process.env.AURA_MODEL || 'gpt-4-turbo',
  tavilyApiKey: process.env.TAVILY_API_KEY,
  n8nBaseUrl: process.env.N8N_BASE_URL,
  graphitiBaseUrl: process.env.GRAPHITI_BASE_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  msGraphToken: process.env.MS_GRAPH_TOKEN,
  makeApiKey: process.env.MAKE_API_KEY,
  zapierToken: process.env.ZAPIER_TOKEN,
  githubToken: process.env.GITHUB_TOKEN,
};

