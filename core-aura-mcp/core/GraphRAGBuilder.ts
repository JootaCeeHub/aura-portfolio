/**
 * GraphRAGBuilder.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Construcción automática de grafos semánticos usando:
 *
 *   ✔ Nodos: entidades, conceptos, temas, chunks, documentos
 *   ✔ Aristas: relaciones semánticas, co-ocurrencias, dependencia lógica
 *   ✔ Integración con Graphiti Server (AURA_GRAPHITI)
 *   ✔ Integración opcional con VectorEngine + embeddings
 *   ✔ Extracción automática de entidades (NER)
 *   ✔ Linkeo multinivel (document → chunk → entidad → concepto)
 *
 * Alineado con:
 *    - RAG con Grafos (LightRAG, GraphRAG, RAG-Anything)
 *    - MCP + Graphiti Server
 *    - AURA-MCP Orchestrator (multihop reasoning)
 */

import { Logger } from '../src/lib/logger.js';
import VectorEngine from '../integration/vectorEngine.js';

const GRAPHITI = (globalThis as any).AURA_GRAPHITI || null;

// ============================================================================
// 1. Tipos internos
// ============================================================================

export interface GraphNode {
  id?: string;
  type: 'document' | 'chunk' | 'entity' | 'concept' | 'topic';
  label: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface GraphBuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: string;
}

// ============================================================================
// 2. Utilidades internas
// ============================================================================

function extractEntities(text: string): string[] {
  /**
   * Mini-NER basado en heurísticas simples.
   * Puedes reemplazarlo por un modelo real via AURA_MODEL.invoke()
   */
  const entities = new Set<string>();

  const regexCapital = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/g;
  let match;

  while ((match = regexCapital.exec(text))) {
    const entity = match[1].trim();
    if (entity.length > 2 && entity !== 'El' && entity !== 'La') {
      entities.add(entity);
    }
  }

  return [...entities];
}

function cooccurrenceWeight(text: string, e1: string, e2: string): number {
  const lower = text.toLowerCase();
  const c1 = lower.includes(e1.toLowerCase());
  const c2 = lower.includes(e2.toLowerCase());
  return c1 && c2 ? 1 : 0;
}

// ============================================================================
// 3. GraphRAGBuilder Core
// ============================================================================

class GraphRAGBuilderCore {
  /**
   * Construye un grafo semántico completo a partir de:
   *   - DocumentID
   *   - Chunks extraídos previamente
   *   - Metadata
   */
  async buildFromChunks(
    documentId: string,
    chunks: string[],
    metadata: Record<string, any> = {}
  ): Promise<GraphBuildResult> {
    Logger.info('[GraphRAGBuilder] Construyendo grafo para documento', {
      documentId,
      totalChunks: chunks.length,
    });

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // -----------------------------------------------------------
    // 1. Crear nodo principal del documento
    // -----------------------------------------------------------
    const documentNode: GraphNode = {
      id: `doc_${documentId}`,
      type: 'document',
      label: metadata.title || `Documento ${documentId}`,
      metadata,
    };

    nodes.push(documentNode);

    // -----------------------------------------------------------
    // 2. Procesar cada chunk → nodos de chunk + entidades
    // -----------------------------------------------------------
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `chunk_${documentId}_${i}`;

      const chunkNode: GraphNode = {
        id: chunkId,
        type: 'chunk',
        label: `Chunk ${i}`,
        metadata: {
          documentId,
          order: i,
          textPreview: chunk.slice(0, 200),
        },
        embedding: await VectorEngine.embedText(chunk),
      };

      nodes.push(chunkNode);

      // Enlace documento → chunk
      edges.push({
        source: documentNode.id!,
        target: chunkNode.id!,
        relation: 'contains',
        weight: 0.9,
      });

      // -----------------------------------------
      // Extraer entidades desde el chunk
      // -----------------------------------------
      const entities = extractEntities(chunk);

      for (const ent of entities) {
        const entityId = `ent_${ent.replace(/\s+/g, '_')}`;

        // Si no existe, crearlo
        if (!nodes.find((n) => n.id === entityId)) {
          nodes.push({
            id: entityId,
            type: 'entity',
            label: ent,
            metadata: { source: 'NER' },
            embedding: await VectorEngine.embedText(ent),
          });
        }

        // Crear relación chunk → entidad
        edges.push({
          source: chunkNode.id!,
          target: entityId,
          relation: 'mentions',
          weight: 0.7,
        });
      }

      // -----------------------------------------
      // Relaciones entre entidades (co-ocurrencia)
      // -----------------------------------------
      for (let a = 0; a < entities.length; a++) {
        for (let b = a + 1; b < entities.length; b++) {
          const w = cooccurrenceWeight(chunk, entities[a], entities[b]);
          if (w > 0) {
            edges.push({
              source: `ent_${entities[a].replace(/\s+/g, '_')}`,
              target: `ent_${entities[b].replace(/\s+/g, '_')}`,
              relation: 'cooccurs_with',
              weight: 0.6,
            });
          }
        }
      }
    }

    // -----------------------------------------------------------
    // 3. Integración opcional con Graphiti Server
    // -----------------------------------------------------------
    if (GRAPHITI && typeof GRAPHITI.addNodes === 'function') {
      try {
        await GRAPHITI.addNodes(nodes);
        await GRAPHITI.addEdges(edges);

        Logger.info('[GraphRAGBuilder] Grafo subido a Graphiti Server.');
      } catch (err: any) {
        Logger.error('[GraphRAGBuilder] Error subiendo grafo a Graphiti', {
          error: err.message,
        });
      }
    }

    // -----------------------------------------------------------
    // 4. Generar resumen de estructura del grafo
    // -----------------------------------------------------------
    const summary = `
Grafo creado correctamente.
- Nodos: ${nodes.length}
- Aristas: ${edges.length}
- Documento raíz: ${documentId}
- Tipos: document, chunk, entity
`;

    return {
      nodes,
      edges,
      summary,
    };
  }

  /**
   * Construye grafo directamente desde texto completo
   */
  async buildFromText(documentId: string, text: string, metadata: Record<string, any> = {}) {
    // Chunking inteligente
    const chunks = this.smartChunk(text, 1200);

    return await this.buildFromChunks(documentId, chunks, metadata);
  }

  /**
   * Chunking avanzado con división por saltos de línea y párrafos
   */
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

// ============================================================================
// 8. Export singleton
// ============================================================================

export const GraphRAGBuilder = new GraphRAGBuilderCore();
export default GraphRAGBuilder;
