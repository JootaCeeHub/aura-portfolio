/**
 * supabaseConnector.ts — AURA-MCP
 * ================================================================================
 * Conector centralizado con Supabase.
 *
 * Soporta:
 *  ✔ Conexion a Supabase (REST/PostgREST)
 *  ✔ RLS-aware
 *  ✔ consultas CRUD
 *  ✔ inserción de logs e historial
 *  ✔ tablas vectoriales
 *
 * Basado en:
 *   Plantilla MCP+IA (sección RAG / Vector DB)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../lib/logger.js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRole?: string;
  schema?: string;
}

class SupabaseConnectorCore {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;

  configure(cfg: SupabaseConfig) {
    this.config = cfg;

    this.client = createClient(cfg.url, cfg.anonKey, {
      db: { schema: cfg.schema || 'public' },
    });

    Logger.info('[SupabaseConnector] configurado.', {
      url: cfg.url,
      schema: cfg.schema,
    });
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('[SupabaseConnector] No inicializado. Llama configure() primero.');
    }
    return this.client;
  }

  // ============================================================================
  // LOGS · HISTORIAL
  // ============================================================================

  async insertLog(table: string, data: Record<string, any>): Promise<boolean> {
    try {
      const client = this.getClient();
      const { error } = await client.from(table).insert(data);

      if (error) {
        Logger.error('[SupabaseConnector] Error insertando log:', {
          table,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (err: any) {
      Logger.error('[SupabaseConnector] Excepción insertLog:', {
        error: err.message,
      });
      return false;
    }
  }

  async find(table: string, filters: Record<string, any>) {
    const client = this.getClient();
    let query = client.from(table).select('*');

    for (const k of Object.keys(filters)) {
      query = query.eq(k, filters[k]);
    }

    const { data, error } = await query;
    if (error) {
      Logger.error('[SupabaseConnector] Error find():', {
        table,
        error: error.message,
      });
      return [];
    }

    return data || [];
  }
}

export const SupabaseConnector = new SupabaseConnectorCore();
export default SupabaseConnector;
