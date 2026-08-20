import { describe, it, expect, beforeAll } from 'vitest';
import { CoreTools } from '../src/tools/coreTools.js';
import { Registry } from '../src/lib/registry.js';

describe('CoreTools – Funciones del Core AURA', () => {
  beforeAll(() => {
    (Registry as any).list = () => [
      {
        name: 'mcp-n8n-workflows',
        url: 'http://localhost:3001',
        scopes: ['automation'],
      },
      {
        name: 'mcp-excel',
        url: 'http://localhost:3002',
        scopes: ['data'],
      },
    ];
  });

  it('core.getStatus entrega estado básico del core', async () => {
    const status = await CoreTools.getStatus();
    expect(status).toHaveProperty('ok');
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('modules');
  });

  it('core.listServers lista los módulos registrados', async () => {
    const res = await CoreTools.listServers();
    expect(res.servers.length).toBeGreaterThan(0);
  });

  it('core.route_tool falla si no existe el módulo', async () => {
    const res = await CoreTools.routeTool({ server: 'mcp-no-existe', tool: 'tool.fake', args: {} });
    expect(res.error).toBeDefined();
  });
});
