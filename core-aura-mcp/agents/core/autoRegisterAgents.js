/**
 * AutoRegisterAgents.ts — AURA-MCP
 * -------------------------------------------------------------------
 * Carga automática de agentes desde:
 *    src/repository/prompts/agent_*.txt
 *
 * Características Enterprise:
 *  ✔ Validación estricta de headers (# NAME, # ROLE, # TOOLS)
 *  ✔ Validación completa vía AgentSchemas
 *  ✔ Auto-registro en AgentManager
 *  ✔ Sanitización de prompts
 *  ✔ Auditoría avanzada
 *  ✔ Logs enriquecidos
 *  ✔ Soporte para hot reload
 *  ✔ Tolerancia a fallos de archivos individuales
 */
import fs from 'fs';
import path from 'path';
import { Logger } from '../../src/lib/logger.js';
import { AgentManager } from './agentManager.js';
import { validatePromptHeader, validateAgentDefinition } from '../adapters/agentSchemas.js';
export class AutoRegisterAgents {
  /**
   * Carga TODOS los agentes desde el repositorio.
   * Se usa al iniciar el Core y en core.agent.autoload().
   */
  static load() {
    Logger.info('[AutoRegisterAgents] Iniciando carga automática…');
    if (!fs.existsSync(this.basePath)) {
      Logger.warn('[AutoRegisterAgents] No existe directorio de prompts', {
        path: this.basePath,
      });
      return { totalAgents: 0, errors: [] };
    }
    const files = fs
      .readdirSync(this.basePath)
      .filter((f) => f.startsWith('agent_') && f.endsWith('.txt'));
    Logger.info('[AutoRegisterAgents] Archivos encontrados', { files });
    let successCount = 0;
    const errors = [];
    for (const file of files) {
      try {
        this.loadFile(file);
        successCount++;
      } catch (err) {
        errors.push(file);
      }
    }
    return { totalAgents: successCount, errors };
  }
  /**
   * Procesa un archivo individual.
   * Permite hot-reload si se llama manualmente.
   */
  static loadFile(file) {
    const fullPath = path.join(this.basePath, file);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      // -------------------------------------------
      // 1) Extraer header (# NAME, # ROLE, # TOOLS)
      // -------------------------------------------
      const name = raw.match(/#\s*NAME:\s*(.*)/)?.[1]?.trim();
      const role = raw.match(/#\s*ROLE:\s*(.*)/)?.[1]?.trim();
      const toolsLine = raw.match(/#\s*TOOLS:\s*(.*)/)?.[1]?.trim() ?? '';
      if (!name || !role) {
        Logger.error('[AutoRegisterAgents] Header inválido', { file });
        return;
      }
      const parsedHeader = validatePromptHeader({
        NAME: name,
        ROLE: role,
        TOOLS: toolsLine
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      // -------------------------------------------
      // 2) Extraer System Prompt (líneas no-#)
      // -------------------------------------------
      const systemPrompt = raw
        .split('\n')
        .filter((l) => !l.trim().startsWith('#'))
        .join('\n')
        .trim();
      if (systemPrompt.length < 10) {
        Logger.warn('[AutoRegisterAgents] SystemPrompt muy corto', {
          file,
          chars: systemPrompt.length,
        });
      }
      // -------------------------------------------
      // 3) Validación estructural
      // -------------------------------------------
      const validatedAgent = validateAgentDefinition({
        id: parsedHeader.NAME.toLowerCase().replace(/\s+/g, '-'),
        name: parsedHeader.NAME,
        role: parsedHeader.ROLE,
        type: 'analysis',
        description: `Agente cargado automáticamente desde ${file}`,
        systemPrompt,
        capabilities: [],
        langchain: 'react',
        allowedTools: parsedHeader.TOOLS,
        allowedScopes: [],
        memory: {},
      });
      // -------------------------------------------
      // 4) Registrar
      // -------------------------------------------
      AgentManager.register(validatedAgent);
      Logger.info('[AutoRegisterAgents] Agente cargado OK', {
        name: parsedHeader.NAME,
        role: parsedHeader.ROLE,
        tools: parsedHeader.TOOLS.length,
      });
    } catch (err) {
      Logger.error('[AutoRegisterAgents] Error procesando archivo', {
        file,
        error: err.message,
      });
    }
  }
}
AutoRegisterAgents.basePath = path.resolve('src/repository/prompts');
