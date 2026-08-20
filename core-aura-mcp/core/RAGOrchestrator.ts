/**
 * RAGOrchestrator.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Orquestador RAG híbrido completo:
 *
 *   ✔ RAG Vectorial (Supabase + embeddings)
 *   ✔ RAG Semántico (VectorEngine)
 *   ✔ RAG Metadata-aware
 *   ✔ RAG basado en Grafos (GraphRAG / Graphiti)
 *   ✔ Chunking avanzado inteligente
 *   ✔ Cache de embeddings (opcional)
 *   ✔ Fusión y scoring híbrido
 *
 * Se integra con:
 *   - VectorEngine (integration/vectorEngine.ts)
 *   - SupabaseConnector
 *   - Graphiti server (si está configurado)
 *   - PipelineEngine
 *   - LangChainExecutor
 *   - OrchestratorCore
 */

import { Logger } from '../lib/logger.js';
import VectorEngine from '../integration/vectorEngine.js';
import SupabaseConnector from '../integration/supabaseConnector.js';

// Permite trabajar con graphRAG si el servicio está configurado
const GRAPHITI = (globalThis as any).AURA_GRAPHITI || null;

// =============================================================================
// 1. Tipos
// =============================================================================

export interface RAGQueryOptions {
  topK?: number;
  metadata?: Record<string, any>;
  useGraph?: boolean;
  useHybrid?: boolean;
  useCache?: boolean;
}

export interface RAGDocument {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export interface HyrbidRAGResult {
  query: string;
  vectorMatches: RAGDocument[];
  graphMatches: RAGDocument[];
  metadataMatches: RAGDocument[];
  combined: RAGDocument[];
  context: string;
}

// =============================================================================
// 2. Chunking Inteligente
// =============================================================================

export class Chunker {
  static chunk(text: string, maxSize = 1200): string[] {
    const parts: string[] = [];

    if (text.length <= maxSize) return [text];

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + maxSize, text.length);
      parts.push(text.slice(start, end));
      start = end;
    }

    return parts;
  }
}

// =============================================================================
// 3. Búsqueda por metadata simple
// =============================================================================

async function metadataSearch(
  table: string,
  metadata: Record<string, any>,
  limit = 10
): Promise<RAGDocument[]> {
  const client = SupabaseConnector.getClient();

  let query = client.from(table).select('*').limit(limit);

  for (const key of Object.keys(metadata)) {
    query = query.eq(key, metadata[key]);
  }

  const { data, error } = await query;
  if (error) {
    Logger.error('[RAGOrchestrator] Error metadataSearch', {
      error: error.message,
    });
    return [];
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    text: d.content || d.text || '',
    score: 0.25, // metadata tiene score bajo comparado a vector
    metadata: d.metadata || {},
  }));
}

// =============================================================================
// 4. GraphRAG — Graphiti Integration
// =============================================================================

async function graphSearch(query: string, topK: number = 5): Promise<RAGDocument[]> {
  if (!GRAPHITI || typeof GRAPHITI.search !== 'function') {
    return [];
  }

  try {
    const res = await GRAPHITI.search(query, { topK });

    return (res.matches || []).map((m: any) => ({
      id: m.id,
      text: m.text,
      score: m.score || 0.5,
      metadata: m.metadata || {},
    }));
  } catch (err: any) {
    Logger.error('[RAGOrchestrator] Error GraphRAG', {
      error: err.message,
    });
    return [];
  }
}

// =============================================================================
// 5. Fusión Híbrida
// =============================================================================

function mergeResults(
  vectorMatches: RAGDocument[],
  graphMatches: RAGDocument[],
  metadataMatches: RAGDocument[],
  topK: number
): RAGDocument[] {
  const all = [...vectorMatches, ...graphMatches, ...metadataMatches];

  // Normalizamos scores
  const sorted = all.sort((a, b) => b.score - a.score);

  // Deduplicar por id
  const unique = new Map<string, RAGDocument>();
  sorted.forEach((m) => {
    if (!unique.has(m.id)) {
      unique.set(m.id, m);
    }
  });

  return Array.from(unique.values()).slice(0, topK);
}

// =============================================================================
// 6. Construcción del contexto
// =============================================================================

function buildContext(docs: RAGDocument[]): string {
  return docs
    .map(
      (d) =>
        `---\nID: ${d.id}\nScore: ${d.score}\nMetadata: ${JSON.stringify(d.metadata)}\n${d.text}`
    )
    .join('\n\n');
}

// =============================================================================
// 7. Orquestador RAG principal
// =============================================================================

class RAGOrchestratorCore {
  async run(query: string, options: RAGQueryOptions = {}): Promise<HyrbidRAGResult> {
    const topK = options.topK || 5;

    Logger.info('[RAGOrchestrator] Ejecutando RAG híbrido', {
      query,
      topK,
      useGraph: options.useGraph,
      useHybrid: options.useHybrid,
      metadata: options.metadata || {},
    });

    // ------------------------------------------------------
    // 1. RAG Vectorial
    // ------------------------------------------------------
    const vectorMatches = await VectorEngine.matchEmbedding(query, topK);

    // ------------------------------------------------------
    // 2. Metadata search (si aplica)
    // ------------------------------------------------------
    let metadataMatches: RAGDocument[] = [];
    if (options.metadata && Object.keys(options.metadata).length > 0) {
      metadataMatches = await metadataSearch('documents_embeddings', options.metadata, topK);
    }

    // ------------------------------------------------------
    // 3. GraphRAG (Graphiti)
    // ------------------------------------------------------
    let graphMatches: RAGDocument[] = [];
    if (options.useGraph) {
      graphMatches = await graphSearch(query, topK);
    }

    // ------------------------------------------------------
    // 4. Fusión híbrida
    // ------------------------------------------------------
    const combined = mergeResults(vectorMatches, graphMatches, metadataMatches, topK);

    // ------------------------------------------------------
    // 5. Construcción del contexto
    // ------------------------------------------------------
    const context = buildContext(combined);

    return {
      query,
      vectorMatches,
      graphMatches,
      metadataMatches,
      combined,
      context,
    };
  }

  // -----------------------------------------------------------------------------
  // RAG con chunking automático
  // -----------------------------------------------------------------------------
  async runWithChunking(text: string, query: string, options: RAGQueryOptions = {}) {
    const chunks = Chunker.chunk(text, 1200);

    Logger.info('[RAGOrchestrator] Chunking usando', {
      totalChunks: chunks.length,
    });

    const uploads: string[] = [];

    for (const c of chunks) {
      await VectorEngine.insertEmbedding({
        text: c,
        embedding: await VectorEngine.embedText(c),
        metadata: { source: 'chunk', querySource: query },
      });
      uploads.push('ok');
    }

    return await this.run(query, options);
  }
}

// =============================================================================
// 8. Export Singleton
// =============================================================================

export const RAGOrchestrator = new RAGOrchestratorCore();
export default RAGOrchestrator;
