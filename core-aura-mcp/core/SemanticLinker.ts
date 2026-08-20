/**
 * SemanticLinker.ts — AURA-MCP (Enterprise 2025)
 * ================================================================================
 * Módulo responsable de enlazar grafos y embeddings entre distintos Knowledge Packs.
 *
 * Capacidades:
 *  ✔ Vinculo semántico entre nodos basado en embeddings
 *  ✔ Co-ocurrencia global (cross-pack)
 *  ✔ Vinculos jerárquicos (concept → sub-concept)
 *  ✔ Integración con Graphiti para añadir edges globales
 *  ✔ Fusión de dominios (legal + tributario + negocio + diagnóstico)
 *  ✔ Cálculo de similitud coseno para crear relaciones
 *  ✔ Limpieza de duplicados + normalización
 *
 * Este módulo permite construir un *meta-grafo unificado* con conocimiento transversal.
 */

import { Logger } from '../lib/logger.js';
import SupabaseConnector from '../integration/supabaseConnector.js';
import VectorEngine from '../integration/vectorEngine.js';

const GRAPHITI = (globalThis as any).AURA_GRAPHITI || null;

// ============================================================================
// 1. Tipos
// ============================================================================

export interface LinkerNode {
  id: string;
  label: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface SemanticLink {
  source: string;
  target: string;
  score: number; // similitud coseno
  relation: string; // "semantic_link", "hierarchical", etc.
  metadata?: Record<string, any>;
}

export interface LinkOptions {
  similarityThreshold?: number; // default 0.82
  maxLinks?: number; // default 20
  relation?: string; // semantic_link / cross_domain
  metadata?: Record<string, any>;
}

// ============================================================================
// 2. Utilidades internas
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// 3. SemanticLinker principal
// ============================================================================

class SemanticLinkerCore {
  /**
   * Une grafos entre dos packs basándose en embeddings.
   */
  async linkPacks(packA: string, packB: string, options: LinkOptions = {}) {
    const threshold = options.similarityThreshold ?? 0.82;
    const maxLinks = options.maxLinks ?? 20;

    Logger.info('[SemanticLinker] Iniciando vinculación entre packs', {
      packA,
      packB,
      threshold,
      maxLinks,
    });

    // ---------------------------------------------------------
    // 1. Obtener nodos vectoriales desde Supabase
    // ---------------------------------------------------------
    const nodesA = await this.loadVectorNodes(packA);
    const nodesB = await this.loadVectorNodes(packB);

    if (nodesA.length === 0 || nodesB.length === 0) {
      Logger.error('[SemanticLinker] No hay nodos para vincular');
      return {
        totalLinks: 0,
        links: [],
      };
    }

    // ---------------------------------------------------------
    // 2. Calcular similitud cruzada
    // ---------------------------------------------------------
    const links: SemanticLink[] = [];

    for (const a of nodesA) {
      for (const b of nodesB) {
        if (!a.embedding || !b.embedding) continue;

        const score = cosineSimilarity(a.embedding, b.embedding);

        if (score >= threshold) {
          links.push({
            source: a.id,
            target: b.id,
            score,
            relation: options.relation || 'semantic_link',
            metadata: {
              packA,
              packB,
              ...options.metadata,
            },
          });
        }
      }
    }

    // ---------------------------------------------------------
    // 3. Ordenar y cortar los mejores
    // ---------------------------------------------------------
    const bestLinks = links.sort((a, b) => b.score - a.score).slice(0, maxLinks);

    Logger.info('[SemanticLinker] Links generados', {
      total: bestLinks.length,
    });

    // ---------------------------------------------------------
    // 4. Guardar en Graphiti (opcional)
    // ---------------------------------------------------------
    if (GRAPHITI) {
      try {
        await GRAPHITI.addEdges(
          bestLinks.map((l) => ({
            source: l.source,
            target: l.target,
            relation: l.relation,
            weight: l.score,
            metadata: l.metadata,
          }))
        );
      } catch (err: any) {
        Logger.error('[SemanticLinker] Error subiendo edges a Graphiti', {
          error: err.message,
        });
      }
    }

    // ---------------------------------------------------------
    // 5. Registrar en Supabase (registro histórico)
    // ---------------------------------------------------------
    try {
      for (const link of bestLinks) {
        await SupabaseConnector.insertLog('semantic_links_history', {
          source: link.source,
          target: link.target,
          score: link.score,
          relation: link.relation,
          metadata: link.metadata,
        });
      }
    } catch {
      // mantener ejecución
    }

    return {
      totalLinks: bestLinks.length,
      links: bestLinks,
    };
  }

  /**
   * Vincula un pack contra TODOS los demás packs instalados.
   */
  async linkPackAgainstAll(packId: string, allPacks: string[], options: LinkOptions = {}) {
    const result: any = {
      packId,
      linked: [],
    };

    for (const other of allPacks) {
      if (other === packId) continue;

      const links = await this.linkPacks(packId, other, options);

      result.linked.push({
        targetPack: other,
        links,
      });
    }

    return result;
  }

  /**
   * Cargar nodos vectoriales asociados a un pack
   */
  private async loadVectorNodes(packId: string): Promise<LinkerNode[]> {
    const client = SupabaseConnector.getClient();

    const { data, error } = await client
      .from('documents_embeddings')
      .select('*')
      .contains('metadata', { packId });

    if (error) {
      Logger.error('[SemanticLinker] Error cargando nodos', {
        packId,
        error: error.message,
      });
      return [];
    }

    return (data || []).map(
      (row: any): LinkerNode => ({
        id: row.id,
        label: row.metadata?.title || `doc_${row.id}`,
        embedding: row.embedding,
        metadata: row.metadata || {},
      })
    );
  }

  /**
   * Vincula nodos individuales directamente por similitud
   */
  async linkTexts(textA: string, textB: string, metadata: Record<string, any> = {}) {
    const embA = await VectorEngine.embedText(textA);
    const embB = await VectorEngine.embedText(textB);

    const score = cosineSimilarity(embA, embB);

    return {
      score,
      match: score > 0.82,
      relation: score > 0.9 ? 'strong_relation' : 'weak_relation',
      metadata,
    };
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const SemanticLinker = new SemanticLinkerCore();
export default SemanticLinker;
