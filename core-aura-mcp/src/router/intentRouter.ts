import { Registry } from '../lib/registry.js';
import { Logger } from '../lib/logger.js';
import { Policies } from '../config/policies.js';

export class IntentRouter {
  validateIntent(intent: string): boolean {
    return Policies.checkTextAllowed(intent);
  }

  /**
   * Este es el lugar donde puedes ir refinando reglas según Arquitectura AURA-MCP.
   */
  async resolveModule(intent: string) {
    const registry = await Registry.list();
    const text = intent.toLowerCase();

    if (text.includes('workflow') || text.includes('n8n')) {
      return registry.find((m) => m.name === 'mcp-n8n-workflows');
    }

    if (text.includes('grafo') || text.includes('kg') || text.includes('conocimiento')) {
      return registry.find((m) => m.name === 'mcp-graphiti-kg');
    }

    if (text.includes('buscar') || text.includes('web') || text.includes('noticias')) {
      return registry.find((m) => m.name === 'mcp-tavily-web');
    }

    if (text.includes('excel') || text.includes('reporte') || text.includes('planilla')) {
      return registry.find((m) => m.name === 'mcp-excel');
    }

    if (text.includes('trading') || text.includes('velas') || text.includes('backtest')) {
      return registry.find((m) => m.name === 'mcp-trading');
    }

    // Fallback: primer módulo del registry
    return registry[0];
  }

  async route(intent: string, tool: string, args: any = {}) {
    if (!this.validateIntent(intent)) {
      Logger.warn('Intent rechazado por políticas de contenido', { intent });
      return {
        error: 'Solicitud rechazada por políticas internas del sistema AURA.',
      };
    }

    const target = await this.resolveModule(intent);
    if (!target) {
      Logger.error('No se encontró módulo para la intención', { intent });
      return { error: 'No se encontró un módulo adecuado para la intención.' };
    }

    if (Policies.isSensitiveOperation(target.name, tool)) {
      Logger.warn('Operación sensible detectada', { server: target.name, tool });
      // Aquí podrías exigir una confirmación adicional, logs extra, etc.
    }

    Logger.info('Enrutando intención', { intent, tool, target: target.name });

    try {
      const result = await Registry.callModule(target, {
        jsonrpc: '2.0',
        method: tool,
        params: args,
        id: Date.now(),
      });

      return { result };
    } catch (err: any) {
      Logger.error('Error llamando a módulo MCP desde router', {
        server: target.name,
        tool,
        error: err.message,
      });
      return { error: `Error llamando al MCP ${target.name}: ${err.message}` };
    }
  }
}
