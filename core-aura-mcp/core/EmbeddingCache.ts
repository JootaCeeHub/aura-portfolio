/**
 * EmbeddingCache.ts — AURA-MCP (Enterprise 2025)
 * ===============================================================================
 * Cache de embeddings híbrido:
 *
 *   ✔ Memoria local (Map)
 *   ✔ Cache Redis (si está disponible)
 *   ✔ TTL y expiración
 *   ✔ Hash determinístico para claves
 *   ✔ Stats de cache hits y misses
 *
 * Usado por:
 *   - VectorEngine
 *   - GraphRAGBuilder
 *   - SemanticLinker
 *   - KnowledgePackLoader
 */

import crypto from 'crypto';
import { Logger } from '../src/lib/logger.js';

let RedisClient: any = null;
try {
  RedisClient = (globalThis as any).AURA_REDIS || null;
} catch {
  RedisClient = null;
}

// ============================================================================
// 1. Tipos
// ============================================================================

export interface CacheEntry {
  embedding: number[];
  createdAt: number;
  ttl?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  savedCostUSD: number;
  savedTokens: number;
}

// ============================================================================
// 2. EmbeddingCache Principal
// ============================================================================

class EmbeddingCacheCore {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    savedCostUSD: 0,
    savedTokens: 0,
  };

  private defaultTTL = 1000 * 60 * 60 * 24 * 7; // 7 días

  // ---------------------------------------------------------------------------
  // Generar clave hash para texto + modelo
  // ---------------------------------------------------------------------------
  private makeKey(text: string, model: string): string {
    return crypto
      .createHash('sha256')
      .update(model + '::' + text)
      .digest('hex');
  }

  // ---------------------------------------------------------------------------
  // Leer cache (memoria → Redis)
  // ---------------------------------------------------------------------------
  private async getFromRedis(key: string): Promise<CacheEntry | null> {
    if (!RedisClient) return null;

    try {
      const raw = await RedisClient.get(key);
      if (!raw) return null;

      return JSON.parse(raw);
    } catch (err: any) {
      Logger.error('[EmbeddingCache] Error leyendo desde Redis', {
        key,
        error: err.message,
      });
      return null;
    }
  }

  private async saveToRedis(key: string, entry: CacheEntry) {
    if (!RedisClient) return;

    try {
      await RedisClient.set(key, JSON.stringify(entry));
      await RedisClient.expire(key, (entry.ttl ?? this.defaultTTL) / 1000);
    } catch (err: any) {
      Logger.error('[EmbeddingCache] Error guardando en Redis', {
        key,
        error: err.message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Obtener embedding desde cache
  // ---------------------------------------------------------------------------
  async get(text: string, model: string): Promise<number[] | null> {
    const key = this.makeKey(text, model);

    // 1) Memory cache
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;

      if (Date.now() - entry.createdAt < (entry.ttl ?? this.defaultTTL)) {
        this.stats.hits++;
        this.stats.savedCostUSD += 0.0001; // aproximado
        this.stats.savedTokens += text.length; // aproximación simple
        return entry.embedding;
      }

      // expiro
      this.memoryCache.delete(key);
    }

    // 2) Redis
    const redisEntry = await this.getFromRedis(key);
    if (redisEntry) {
      this.stats.hits++;
      this.stats.savedCostUSD += 0.0001;
      this.stats.savedTokens += text.length;

      this.memoryCache.set(key, redisEntry);
      return redisEntry.embedding;
    }

    this.stats.misses++;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Guardar embedding en cache
  // ---------------------------------------------------------------------------
  async set(text: string, model: string, embedding: number[], ttl?: number) {
    const key = this.makeKey(text, model);

    const entry: CacheEntry = {
      embedding,
      createdAt: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    this.memoryCache.set(key, entry);
    await this.saveToRedis(key, entry);
  }

  // ---------------------------------------------------------------------------
  // Invalidar clave
  // ---------------------------------------------------------------------------
  async invalidate(text: string, model: string) {
    const key = this.makeKey(text, model);
    this.memoryCache.delete(key);

    if (RedisClient) {
      try {
        await RedisClient.del(key);
      } catch {
        // ignore
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Borrar todo
  // ---------------------------------------------------------------------------
  async clear() {
    this.memoryCache.clear();
    if (RedisClient) {
      try {
        await RedisClient.flushdb();
      } catch {
        // ignore
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  getStats(): CacheStats {
    return this.stats;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const EmbeddingCache = new EmbeddingCacheCore();
export default EmbeddingCache;
