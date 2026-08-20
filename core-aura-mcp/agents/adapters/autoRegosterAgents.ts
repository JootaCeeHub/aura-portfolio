/**
 * autoRegisterAgents.ts — AURA-MCP
 * -------------------------------------------------------------------
 * Descubre, valida y registra automáticamente todos los agentes
 * ubicados dentro de:
 *
 *   /agents/roles
 *   /agents/core
 *   /agents/tools
 *
 * Funciona como loader central para:
 *   ✔ OrchestratorCore
 *   ✔ AgentManager
 *   ✔ AURA Pipeline Engine
 *
 * Usa:
 *   - AgentDefinitionSchema (agentSchemas.ts)
 *   - Logger
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../../lib/logger.js';
import { validateAgentDefinition, AgentDefinition } from '../adapters/agentSchemas.js';
import { OrchestratorCore } from './orchestratorCore.js';

const AGENTS_ROOT = path.resolve('agents');

// ================================================================
// 1. Obtener lista de archivos recursivamente
// ================================================================

function getAllAgentFiles(dir: string): string[] {
  let results: string[] = [];

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(getAllAgentFiles(filePath));
    } else if (file.endsWith('.agent.ts') || file.endsWith('.agent.js')) {
      results.push(filePath);
    }
  }

  return results;
}

// ================================================================
// 2. Cargar definición del agente desde archivo
// ================================================================

async function loadAgentDef(file: string): Promise<AgentDefinition | null> {
  try {
    const module = await import(path.resolve(file));
    const agent = module.default || module.agent || null;

    if (!agent) {
      Logger.warn('[AUTO_REGISTER]', `Archivo sin exportar agente: ${file}`);
      return null;
    }

    const validated = validateAgentDefinition(agent);

    return validated;
  } catch (err: any) {
    Logger.error('[AUTO_REGISTER] Error cargando agente', {
      file,
      error: err.message,
    });
    return null;
  }
}

// ================================================================
// 3. Registrar agente en el Orchestrator
// ================================================================

function registerAgent(agent: AgentDefinition, filePath: string) {
  try {
    OrchestratorCore.registerAgent(agent);

    Logger.info('[AUTO_REGISTER] Agente registrado exitosamente', {
      id: agent.id,
      file: filePath,
      type: agent.type,
      role: agent.role,
      scopes: agent.allowedScopes,
    });
  } catch (err: any) {
    Logger.error('[AUTO_REGISTER] Error registrando agente', {
      file: filePath,
      error: err.message,
    });
  }
}

// ================================================================
// 4. PROCESO PRINCIPAL
// ================================================================

export async function autoRegisterAgents() {
  Logger.info('====================================================');
  Logger.info('🧠  AUTO REGISTER AGENTS — AURA MCP');
  Logger.info('====================================================');

  // 1. Escanear archivos
  const agentFiles = getAllAgentFiles(AGENTS_ROOT);

  Logger.info('[AUTO_REGISTER] Agentes detectados', {
    total_files: agentFiles.length,
  });

  // 2. Cargar cada agente
  for (const file of agentFiles) {
    Logger.info('[AUTO_REGISTER] Procesando archivo', { file });

    const agent = await loadAgentDef(file);

    if (!agent) {
      Logger.warn('[AUTO_REGISTER] Agente inválido o no exportado', {
        file,
      });
      continue;
    }

    // 3. Registrar agente
    registerAgent(agent, file);
  }

  Logger.info('====================================================');
  Logger.info('FINALIZADO: Auto-Registro de Agentes');
  Logger.info('====================================================');
}

// ================================================================
// 5. AUTO EJECUCIÓN (opcional)
// ================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  autoRegisterAgents();
}
