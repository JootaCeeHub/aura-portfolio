/**
 * KnowledgePackLoader.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Carga modular de "Paquetes de Conocimiento" (Knowledge Packs) para AURA-MCP.
 *
 * Un Knowledge Pack contiene:
 *   ✔ Documentos textuales o PDF ya procesados
 *   ✔ Embeddings pre-generados o configurados para re-ingestión
 *   ✔ Grafos (GraphRAG / Graphiti) exportados
 *   ✔ Metadata por dominio
 *   ✔ Configuración de agentes especializada
 *   ✔ Templates / prompts / formularios
 *   ✔ Scripts o workflows n8n
 *
 * Funciones:
 *   ✔ Explorar directorios de packs
 *   ✔ Leer config.yaml / pack.json
 *   ✔ Cargar docs → ingest RAG vectorial + grafo
 *   ✔ Cargar metadata
 *   ✔ Cargar agentes
 *   ✔ Cargar grafos a Graphiti (si disponible)
 *
 * Integrado con:
 *   - VectorEngine
 *   - SupabaseConnector
 *   - GraphRAGBuilder
 *   - AgentManager
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { Logger } from '../lib/logger.js';
import VectorEngine from '../integration/vectorEngine.js';
import SupabaseConnector from '../integration/supabaseConnector.js';

import { GraphRAGBuilder } from './GraphRAGBuilder.js';
import { AgentManager } from '../agentManager.js';

// Graphiti server opcional
const GRAPHITI = (globalThis as any).AURA_GRAPHITI || null;

// ============================================================================
// 1. Tipos
// ============================================================================

export interface KnowledgePackConfig {
  id: string;
  name: string;
  version: string;
  domain: string;

  embeddings?: {
    ingest?: boolean;
  };

  graph?: {
    build?: boolean;
    ingest?: boolean;
  };

  metadata?: Record<string, any>;

  agents?: Array<{
    name: string;
    file: string;
  }>;

  documents?: Array<{
    title: string;
    file: string;
    metadata?: Record<string, any>;
  }>;
}

export interface LoadedPackResult {
  packId: string;
  totalDocs: number;
  totalAgents: number;
  totalNodes?: number;
  totalEdges?: number;
  message: string;
}

// ============================================================================
// 2. Loader Core
// ============================================================================

class KnowledgePackLoaderCore {
  /**
   * Carga todos los knowledge packs desde el directorio configurado.
   */
  async loadAllPacks(baseDir: string): Promise<LoadedPackResult[]> {
    if (!fs.existsSync(baseDir)) {
      throw new Error(`Directorio no existe: ${baseDir}`);
    }

    const folders = fs
      .readdirSync(baseDir)
      .filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory());

    Logger.info('[KnowledgePackLoader] Packs encontrados', {
      total: folders.length,
    });

    const results: LoadedPackResult[] = [];

    for (const folder of folders) {
      const packPath = path.join(baseDir, folder);
      const res = await this.loadSinglePack(packPath);
      results.push(res);
    }

    return results;
  }

  /**
   * Carga un solo Knowledge Pack.
   */
  async loadSinglePack(packDir: string): Promise<LoadedPackResult> {
    Logger.info('[KnowledgePackLoader] Cargando Knowledge Pack', {
      folder: packDir,
    });

    const configPathYaml = path.join(packDir, 'pack.yaml');
    const configPathJson = path.join(packDir, 'pack.json');

    let config: KnowledgePackConfig | null = null;

    if (fs.existsSync(configPathYaml)) {
      config = YAML.parse(fs.readFileSync(configPathYaml, 'utf8'));
    } else if (fs.existsSync(configPathJson)) {
      config = JSON.parse(fs.readFileSync(configPathJson, 'utf8'));
    }

    if (!config) {
      throw new Error(`Knowledge Pack inválido: no tiene pack.yaml o pack.json en ${packDir}`);
    }

    const docCount = (config.documents && config.documents.length) || 0;
    const agentCount = (config.agents && config.agents.length) || 0;

    // -----------------------------------------------------------
    // 1. Cargar metadata global del pack
    // -----------------------------------------------------------
    await this.loadPackMetadata(config);

    // -----------------------------------------------------------
    // 2. Cargar agentes específicos (si existen)
    // -----------------------------------------------------------
    await this.loadAgents(packDir, config);

    // -----------------------------------------------------------
    // 3. Cargar documentos (RAG vectorial + grafo)
    // -----------------------------------------------------------
    const { totalNodes, totalEdges } = await this.loadDocuments(packDir, config);

    // -----------------------------------------------------------
    // Final
    // -----------------------------------------------------------
    return {
      packId: config.id,
      totalDocs: docCount,
      totalAgents: agentCount,
      totalNodes,
      totalEdges,
      message: `Knowledge Pack ${config.name} (${config.id}) cargado exitosamente.`,
    };
  }

  // ============================================================================
  // 3. METADATA GLOBAL DEL PACK
  // ============================================================================

  async loadPackMetadata(config: KnowledgePackConfig) {
    const metadata = config.metadata || {};

    if (Object.keys(metadata).length === 0) return;

    Logger.info('[KnowledgePackLoader] Cargando metadata del pack', {
      packId: config.id,
      fields: Object.keys(metadata),
    });

    // Podrías guardarlo en Supabase si deseas versión persistente
    try {
      await SupabaseConnector.insertLog('knowledge_packs_metadata', {
        pack_id: config.id,
        metadata,
      });
    } catch {
      /** mantener ejecución */
    }
  }

  // ============================================================================
  // 4. AGENTES
  // ============================================================================

  async loadAgents(baseDir: string, config: KnowledgePackConfig) {
    if (!config.agents || config.agents.length === 0) return;

    Logger.info('[KnowledgePackLoader] Cargando agentes del pack', {
      count: config.agents.length,
    });

    for (const agentDef of config.agents) {
      const agentPath = path.join(baseDir, agentDef.file);

      if (!fs.existsSync(agentPath)) {
        Logger.error('[KnowledgePackLoader] Agent file no existe', {
          file: agentPath,
        });
        continue;
      }

      try {
        const module = await import(path.resolve(agentPath));
        const agent = module.default || module;

        AgentManager.register(agent);

        Logger.info('[KnowledgePackLoader] Agente registrado', {
          agent: agent.name,
        });
      } catch (err: any) {
        Logger.error('[KnowledgePackLoader] Error cargando agente', {
          file: agentPath,
          error: err.message,
        });
      }
    }
  }

  // ============================================================================
  // 5. DOCUMENTOS
  // ============================================================================

  async loadDocuments(
    baseDir: string,
    config: KnowledgePackConfig
  ): Promise<{ totalNodes: number; totalEdges: number }> {
    if (!config.documents || config.documents.length === 0) {
      return { totalNodes: 0, totalEdges: 0 };
    }

    Logger.info('[KnowledgePackLoader] Cargando documentos del pack', {
      count: config.documents.length,
    });

    let totalNodes = 0;
    let totalEdges = 0;

    for (const doc of config.documents) {
      const fullPath = path.join(baseDir, doc.file);

      if (!fs.existsSync(fullPath)) {
        Logger.error('[KnowledgePackLoader] Documento no existe', {
          file: fullPath,
        });
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');

      // -------------------------------------------------------
      // 5.1 Ingestión vectorial
      // -------------------------------------------------------
      if (config.embeddings?.ingest) {
        const chunks = this.smartChunk(content, 1200);

        for (const chunk of chunks) {
          const embedding = await VectorEngine.embedText(chunk);

          await VectorEngine.insertEmbedding({
            text: chunk,
            embedding,
            metadata: {
              packId: config.id,
              documentTitle: doc.title,
              ...doc.metadata,
            },
          });
        }

        Logger.info('[KnowledgePackLoader] Documento ingerido en RAG', {
          title: doc.title,
        });
      }

      // -------------------------------------------------------
      // 5.2 Construcción del grafo
      // -------------------------------------------------------
      if (config.graph?.build || config.graph?.ingest) {
        const result = await GraphRAGBuilder.buildFromText(
          `${config.id}_${doc.title.replace(/\s+/g, '_')}`,
          content,
          {
            packId: config.id,
            title: doc.title,
            ...doc.metadata,
          }
        );

        totalNodes += result.nodes.length;
        totalEdges += result.edges.length;

        Logger.info('[KnowledgePackLoader] Grafo generado', {
          nodes: result.nodes.length,
          edges: result.edges.length,
        });

        // Si hay Graphiti y la config dice "ingest", se sube
        if (GRAPHITI && config.graph?.ingest) {
          try {
            await GRAPHITI.addNodes(result.nodes);
            await GRAPHITI.addEdges(result.edges);
          } catch (err: any) {
            Logger.error('[KnowledgePackLoader] Error subiendo grafo a Graphiti', {
              error: err.message,
            });
          }
        }
      }
    }

    return { totalNodes, totalEdges };
  }

  // ============================================================================
  // 6. Chunking avanzado
  // ============================================================================

  smartChunk(text: string, maxSize: number): string[] {
    const lines = text.split('\n').map((l) => l.trim());
    const chunks: string[] = [];
    let buffer = '';

    for (const l of lines) {
      if ((buffer + '\n' + l).length > maxSize) {
        chunks.push(buffer);
        buffer = l;
      } else {
        buffer += '\n' + l;
      }
    }

    if (buffer.length > 0) chunks.push(buffer);
    return chunks;
  }
}

// =============================================================================
// Export singleton
// =============================================================================

export const KnowledgePackLoader = new KnowledgePackLoaderCore();
export default KnowledgePackLoader;
