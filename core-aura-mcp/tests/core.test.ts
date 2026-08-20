import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

// Ajusta las rutas según tu estructura actual:
import { MCPServer } from '../src/server/mcpServer.js';
import { Logger } from '../src/lib/logger.js';
import { MCPToolHandler, MCPResourceHandler, MCPRequest } from '../src/types/interfaces.js';

// Pequeño helper para hacer requests JSON-RPC al server HTTP de pruebas
async function callMCP(port: number, method: string, params: any = {}): Promise<any> {
  const payload: MCPRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  };

  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk.toString()));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

describe('MCPServer – Core AURA', () => {
  const TEST_PORT = 3100;
  let server: MCPServer;

  beforeAll(() => {
    // Inicializamos el MCPServer de pruebas
    server = new MCPServer(TEST_PORT);

    // Tool de prueba
    const echoTool: MCPToolHandler = async (params: any) => {
      return { echo: params || null };
    };

    // Resource de prueba
    const statusResource: MCPResourceHandler = async () => {
      return {
        status: 'ok',
        origin: 'test-suite',
      };
    };

    // Registramos tool y resource
    server.tool('test.echo', echoTool);
    server.resource('test.status', statusResource);

    // Arrancamos el server
    server.start();
    Logger.info('MCPServer de pruebas iniciado', { port: TEST_PORT });
  });

  // En este caso no paramos el server para simplificar; Vitest terminará el proceso.
  // Si quisieras detenerlo manualmente, deberías exponer la instancia HTTP interna
  // en MCPServer y cerrarla aquí en afterAll.
  afterAll(() => {
    Logger.info('Suite de tests MCPServer finalizada');
  });

  it('responde a un método tool registrado (test.echo)', async () => {
    const response: any = await callMCP(TEST_PORT, 'test.echo', {
      msg: 'hola_mcp',
    });

    expect(response).toHaveProperty('jsonrpc', '2.0');
    expect(response).toHaveProperty('result');
    expect(response.result).toHaveProperty('echo');
    expect(response.result.echo).toEqual({ msg: 'hola_mcp' });
  });

  it('responde a un recurso registrado (test.status)', async () => {
    const response: any = await callMCP(TEST_PORT, 'test.status');

    expect(response).toHaveProperty('jsonrpc', '2.0');
    expect(response).toHaveProperty('result');
    expect(response.result.status).toBe('ok');
    expect(response.result.origin).toBe('test-suite');
  });

  it('devuelve error para método desconocido', async () => {
    const response: any = await callMCP(TEST_PORT, 'metodo.inexistente');

    expect(response).toHaveProperty('jsonrpc', '2.0');
    expect(response).toHaveProperty('error');
    expect(response.error).toContain('Método desconocido');
  });

  it('maneja errores internos lanzados por una tool', async () => {
    // Tool que lanza error
    const errorTool: MCPToolHandler = async () => {
      throw new Error('Error interno simulado');
    };

    server.tool('test.error_tool', errorTool);

    const response: any = await callMCP(TEST_PORT, 'test.error_tool');

    expect(response).toHaveProperty('jsonrpc', '2.0');
    expect(response).toHaveProperty('error');
    expect(response.error).toContain('Error interno simulado');
  });
});
