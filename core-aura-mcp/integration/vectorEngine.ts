/**
 * vectorEngine.ts — AURA-MCP
 * ================================================================================
 * Motor vectorial (RAG Engine) para embeddings, similitud y recuperación semántica.
 *
 *  ✔ Crea embeddings
 *  ✔ Inserta en tabla vectorial
 *  ✔ match_embeddings() → recuperación top-K
 *  ✔ RAG híbrido (texto + metadata)
 *
 * Alineado con:
 *    Plantilla MCP IA Modular (sección Vector DB, match_embeddings)
 */

import { Logger } from '../src/lib/logger.js';
import SupabaseConnector from './supabaseConnector.js';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface RagMatch {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export interface VectorConfig {
  table: string; // ej: "documents_embeddings"
  textColumn: string; // ej: "content"
  embedColumn: string; // ej: "embedding"
  metadataColumn?: string;
}

class VectorEngineCore {
  private config: VectorConfig | null = null;

  configure(cfg: VectorConfig) {
    this.config = cfg;
    Logger.info('[VectorEngine] Configurado', cfg);
  }

  // ============================================================================
  // EMBEDDINGS
  // ============================================================================

  async embedText(text: string): Promise<number[]> {
    const model = global.AURA_MODEL;
    const result = await model.invoke({
      model: 'text-embedding-3-large',
      prompt: text,
    });

    if (!result.embedding) {
      throw new Error('[VectorEngine] Modelo no devolvió embedding.');
    }

    return result.embedding;
  }

  // ============================================================================
  // INSERTAR EN TABLA VECTORIAL
  // ============================================================================

  async insertEmbedding(result: EmbeddingResult) {
    if (!this.config) throw new Error('VectorEngine sin configuración.');

    const client = SupabaseConnector.getClient();
    const cfg = this.config;

    const row: any = {
      [cfg.textColumn]: result.text,
      [cfg.embedColumn]: result.embedding,
      ...(cfg.metadataColumn ? { [cfg.metadataColumn]: result.metadata || {} } : {}),
    };

    const { error } = await client.from(cfg.table).insert(row);

    if (error) {
      Logger.error('[VectorEngine] Error insertEmbedding:', {
        error: error.message,
      });
      return false;
    }

    return true;
  }

  // ============================================================================
  // match_embeddings() — RAG
  // ============================================================================

  async matchEmbedding(query: string, topK: number = 5): Promise<RagMatch[]> {
    if (!this.config) throw new Error('VectorEngine sin configuración.');
    // const cfg = this.config;

    // 1) Embedding del query
    const queryEmb = await this.embedText(query);

    // 2) Consulta a Supabase usando match_embeddings()
    const client = SupabaseConnector.getClient();

    const { data, error } = await client.rpc('match_embeddings', {
      query_embedding: queryEmb,
      match_count: topK,
    });

    if (error) {
      Logger.error('[VectorEngine] Error en match_embeddings RPC:', {
        error: error.message,
      });
      return [];
    }

    // 3) Formateo de respuesta
    return (data || []).map((row: any) => ({
      id: row.id,
      text: row.content,
      score: row.score,
      metadata: row.metadata || {},
    }));
  }

  // ============================================================================
  // RAG COMPLETO: Embeddings + matches + síntesis
  // ============================================================================

  async rag(query: string, topK: number = 5) {
    const matches = await this.matchEmbedding(query, topK);

    const context = matches
      .map(
        (m) =>
          `---\nID: ${m.id}\nScore: ${m.score}\nMetadata: ${JSON.stringify(m.metadata)}\n${m.text}`
      )
      .join('\n\n');

    return {
      query,
      matches,
      context,
    };
  }
}

export const VectorEngine = new VectorEngineCore();
export default VectorEngine;
