/**
 * supabase.tool.ts — AURA-MCP
 * ================================================================================
 * Tool interno: supabase_agent
 *
 * Responsabilidades:
 *  - Ejecutar operaciones CRUD simples contra Supabase
 *  - Estar RLS-aware (se espera contexto de usuario apropiado)
 *
 * Usa:
 *  - SupabaseConnector (integration/supabaseConnector.ts)
 */

import { z } from 'zod';
import { Logger } from '../../src/lib/logger.js';
import SupabaseConnector from '../../integration/supabaseConnector.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute(input: any, context?: any): Promise<any>;
}

// ============================================================================
// 1. SCHEMAS
// ============================================================================

const SupabaseActionEnum = z.enum(['select', 'insert', 'update', 'delete']);

const SupabaseInputSchema = z.object({
  action: SupabaseActionEnum,
  table: z.string(),
  // where simple eq filters
  filters: z.record(z.any()).optional(),
  // payload para insert/update
  data: z.record(z.any()).optional(),
  // limit para select
  limit: z.number().optional(),
});

const SupabaseOutputSchema = z.object({
  ok: z.boolean(),
  action: SupabaseActionEnum,
  table: z.string(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// ============================================================================
// 2. IMPLEMENTACIÓN
// ============================================================================

async function executeSupabaseTool(input: unknown): Promise<any> {
  const parsed = SupabaseInputSchema.parse(input);
  const client = SupabaseConnector.getClient();

  try {
    if (parsed.action === 'select') {
      let query = client.from(parsed.table).select('*');

      if (parsed.filters) {
        for (const k of Object.keys(parsed.filters)) {
          query = query.eq(k, parsed.filters[k]);
        }
      }

      if (parsed.limit) {
        query = query.limit(parsed.limit);
      }

      const { data, error } = await query;
      if (error) {
        Logger.error('[supabase_agent] Error SELECT', {
          table: parsed.table,
          error: error.message,
        });
        return {
          ok: false,
          action: parsed.action,
          table: parsed.table,
          error: error.message,
        };
      }

      return {
        ok: true,
        action: parsed.action,
        table: parsed.table,
        data,
      };
    }

    if (parsed.action === 'insert') {
      if (!parsed.data) {
        return {
          ok: false,
          action: parsed.action,
          table: parsed.table,
          error: "Falta 'data' para acción insert.",
        };
      }

      const { data, error } = await client.from(parsed.table).insert(parsed.data).select('*');

      if (error) {
        Logger.error('[supabase_agent] Error INSERT', {
          table: parsed.table,
          error: error.message,
        });
        return {
          ok: false,
          action: parsed.action,
          table: parsed.table,
          error: error.message,
        };
      }

      return {
        ok: true,
        action: parsed.action,
        table: parsed.table,
        data,
      };
    }

    if (parsed.action === 'update') {
      if (!parsed.data) {
        return {
          ok: false,
          action: parsed.action,
          table: parsed.table,
          error: "Falta 'data' para acción update.",
        };
      }

      let query = client.from(parsed.table).update(parsed.data);

      if (parsed.filters) {
        for (const k of Object.keys(parsed.filters)) {
          query = query.eq(k, parsed.filters[k]);
        }
      }

      const { data, error } = await query.select('*');

      if (error) {
        Logger.error('[supabase_agent] Error UPDATE', {
          table: parsed.table,
          error: error.message,
        });
        return {
          ok: false,
          action: parsed.action,
          table: parsed.table,
          error: error.message,
        };
      }

      return {
        ok: true,
        action: parsed.action,
        table: parsed.table,
        data,
      };
    }

    if (parsed.action === 'delete') {
      let query = client.from(parsed.table).delete();

      if (parsed.filters) {
        for (const k of Object.keys(parsed.filters)) {
          query = query.eq(k, parsed.filters[k]);
        }
      }

      const { data, error } = await query.select('*');
      if (error) {
        Logger.error('[supabase_agent] Error DELETE', {
          table: parsed.table,
          error: error.message,
        });
        return {
          ok: false,
          action: parsed.action,
          table: parsed.table,
          error: error.message,
        };
      }

      return {
        ok: true,
        action: parsed.action,
        table: parsed.table,
        data,
      };
    }

    return {
      ok: false,
      action: parsed.action,
      table: parsed.table,
      error: 'Acción no soportada.',
    };
  } catch (err: any) {
    Logger.error('[supabase_agent] Excepción general', {
      table: parsed.table,
      error: err.message,
    });
    return {
      ok: false,
      action: parsed.action,
      table: parsed.table,
      error: err.message,
    };
  }
}

// ============================================================================
// 3. TOOL EXPORT
// ============================================================================

export const SupabaseTool: MCPTool = {
  name: 'supabase_agent',
  description:
    'Tool interno para ejecutar operaciones CRUD simples sobre Supabase usando SupabaseConnector.',
  inputSchema: SupabaseInputSchema,
  outputSchema: SupabaseOutputSchema,
  execute: executeSupabaseTool,
};

export default SupabaseTool;
