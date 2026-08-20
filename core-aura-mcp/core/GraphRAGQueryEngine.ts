/**
 * GraphRAGQueryEngine.ts — AURA-MCP (Enterprise)
 * ================================================================================
 * Motor de consultas avanzadas sobre grafos + embeddings:
 *
 * Capacidades:
 *  ✔ Búsqueda por significado (vectorial)
 *  ✔ Búsqueda por conexiones en grafo (Graphiti o BD local)
 *  ✔ Reasoning multihop (2–6 saltos)
 *  ✔ Fusión vector + grafo (GraphRAG híbrido)
 *  ✔ Explicaciones paso a paso
 *  ✔ Path scoring (relevancia semántica + topología del grafo)
 *
 * Usado por:
 *   - OrchestratorCore
 *   - RAGOrchestrator
 *   - SemanticLinker
 *   - PipelineEngine (deep reasoning)
 */

import { Logger } from '../src/lib/logger.js';
import VectorEngine from '../integration/vectorEngine.js';

const GRAPHITI = (globalThis as any).AURA_GRAPHITI || null;

// ============================================================================
// 1. Tipos
// ============================================================================
export interface GraphRAGQueryOptions {
  topK?: number;
  hops?: number;
  similarityThreshold?: number;
  includeVectors?: boolean;
  includeGraph?: boolean;
  explanation?: boolean;
  metadataFilters?: Record<string, any>;
}

export interface GraphRAGAnswer {
  query: string;
  nodes: any[];
  edges: any[];
  reasoningPath: Array<string>;
  context: string;
  summary: string;
}

// ============================================================================
// 2. Utilidades internas
// ============================================================================

async function graphSearch(query: string, topK: number): Promise<any[]> {
  if (!GRAPHITI || typeof GRAPHITI.search !== 'function') return [];

  try {
    const res = await GRAPHITI.search(query, { topK });
    return res.matches || [];
  } catch (err: any) {
    Logger.error('[GraphRAGQueryEngine] Graph search error', {
      error: err.message,
    });
    return [];
  }
}

async function graphExpand(nodeId: string, hops: number): Promise<any[]> {
  if (!GRAPHITI || typeof GRAPHITI.expand !== 'function') return [];

  try {
    const res = await GRAPHITI.expand(nodeId, { depth: hops });
    return res.nodes || [];
  } catch (err: any) {
    Logger.error('[GraphRAGQueryEngine] Graph expand error', {
      error: err.message,
    });
    return [];
  }
}

// ============================================================================
// 3. Scoring híbrido
// ============================================================================

function hybridScore(vectorScore: number, graphRank: number): number {
  const vg = vectorScore * 0.65; // prioridad semántica
  const gg = (1 / (1 + graphRank)) * 0.35; // prioridad topológica
  return vg + gg;
}

// ============================================================================
// 4. Context builder
// ============================================================================
function buildContext(nodes: any[]): string {
  return nodes
    .map((n) => {
      const meta = JSON.stringify(n.metadata || {}, null, 2);
      return `### Nodo: ${n.id}\nLabel: ${n.label}\nMetadata: ${meta}\n---\n${n.text || ''}`;
    })
    .join('\n\n');
}

// ============================================================================
// 5. QueryEngine Principal
// ============================================================================

class GraphRAGQueryEngineCore {
  /**
   * Ejecuta una consulta híbrida (vector + graph) con reasoning multihop.
   */
  async query(query: string, options: GraphRAGQueryOptions = {}): Promise<GraphRAGAnswer> {
    const topK = options.topK ?? 10;
    const hops = options.hops ?? 2;

    Logger.info('[GraphRAGQueryEngine] Ejecutando consulta híbrida RAG+Graph', {
      query,
      topK,
      hops,
    });

    // ---------------------------------------------------------
    // 1. Búsqueda semántica vectorial
    // ---------------------------------------------------------
    const vectorMatches = await VectorEngine.matchEmbedding(query, topK);

    // ---------------------------------------------------------
    // 2. Búsqueda en grafo
    // ---------------------------------------------------------
    const graphMatches = await graphSearch(query, topK);

    // ---------------------------------------------------------
    // 3. Expandir nodos del grafo con multihop
    // ---------------------------------------------------------
    let expandedNodes: any[] = [];

    for (const gm of graphMatches) {
      const exp = await graphExpand(gm.id, hops);
      expandedNodes.push(...exp);
    }

    // eliminar duplicados
    const expandedMap = new Map<string, any>();
    expandedNodes.forEach((n) => expandedMap.set(n.id, n));
    expandedNodes = Array.from(expandedMap.values());

    // ---------------------------------------------------------
    // 4. Fusión híbrida vector + grafo
    // ---------------------------------------------------------
    const combined: any[] = [];

    vectorMatches.forEach((vm) => {
      combined.push({
        id: vm.id,
        label: vm.metadata?.title || `doc_${vm.id}`,
        text: vm.text,
        metadata: vm.metadata,
        vectorScore: vm.score,
        graphRank: 999,
        hybrid: hybridScore(vm.score, 999),
      });
    });

    graphMatches.forEach((gm, idx) => {
      combined.push({
        id: gm.id,
        label: gm.label,
        text: gm.text,
        metadata: gm.metadata,
        vectorScore: 0,
        graphRank: idx + 1,
        hybrid: hybridScore(0, idx + 1),
      });
    });

    expandedNodes.forEach((n, idx) => {
      combined.push({
        id: n.id,
        label: n.label,
        text: n.text,
        metadata: n.metadata,
        vectorScore: 0.1,
        graphRank: idx + 3,
        hybrid: hybridScore(0.1, idx + 3),
      });
    });

    // ---------------------------------------------------------
    // 5. Ranking por score híbrido
    // ---------------------------------------------------------
    const ranked = combined.sort((a, b) => b.hybrid - a.hybrid).slice(0, topK);

    // ---------------------------------------------------------
    // 6. Build context
    // ---------------------------------------------------------
    const context = buildContext(ranked);

    // ---------------------------------------------------------
    // 7. Reasoning path (explicación)
    // ---------------------------------------------------------
    const reasoningPath: string[] = [];

    if (options.explanation) {
      reasoningPath.push('1. Se ejecutó búsqueda vectorial de embeddings.');
      reasoningPath.push('2. Se ejecutó búsqueda en grafo usando Graphiti.');
      reasoningPath.push(`3. Se expandió hasta ${hops} hops.`);
      reasoningPath.push('4. Se fusionaron resultados con scoring híbrido.');
      reasoningPath.push('5. Se generó contexto consolidado para LLM.');
    }

    return {
      query,
      nodes: ranked,
      edges: [], // opcionalmente podemos recuperar edges en otra versión
      reasoningPath,
      context,
      summary: `Consulta híbrida completada: ${ranked.length} nodos relevantes.`,
    };
  }

  /**
   * Consulta multihop pura basada solo en expansión de grafo.
   */
  async multihop(startNodeId: string, hops: number = 3) {
    const nodes = await graphExpand(startNodeId, hops);

    return {
      startNode: startNodeId,
      depth: hops,
      nodes,
      summary: `Expansión multihop desde ${startNodeId} completada.`,
    };
  }

  /**
   * razonamiento semántico directo entre dos textos
   */
  async relate(textA: string, textB: string) {
    const embA = await VectorEngine.embedText(textA);
    const embB = await VectorEngine.embedText(textB);

    const dot = embA.reduce((acc, v, i) => acc + v * embB[i], 0);

    return {
      score: dot,
      strong: dot >= 0.82,
      summary: dot >= 0.82 ? 'Altamente relacionados' : 'Relación débil',
    };
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const GraphRAGQueryEngine = new GraphRAGQueryEngineCore();
export default GraphRAGQueryEngine;
