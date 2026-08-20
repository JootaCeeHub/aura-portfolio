/**
 * document.tool.ts — AURA-MCP
 * ================================================================================
 * Tool interno: document_agent
 *
 * Responsabilidades:
 *  - Recibir documentos (ruta local o base64) + metadata
 *  - Extraer texto plano (page-wise opcional)
 *  - Guardar metadata + contenido + embedding en Supabase (via VectorEngine)
 *
 * Usa:
 *  - VectorEngine (integration/vectorEngine.ts)
 *  - SupabaseConnector si quieres guardar metadata adicional
 *
 * Se asume que el procesamiento de PDF/archivos (OCR, etc.) lo hace
 * un adaptador global: globalThis.AURA_DOC_PARSER
 */

import { z } from 'zod';
import { Logger } from '../../src/lib/logger.js';
import VectorEngine from '../../integration/vectorEngine.js';
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

const DocumentActionEnum = z.enum(['parse', 'ingest', 'parse_and_ingest']);

const DocumentInputSchema = z.object({
  action: DocumentActionEnum,

  // Ruta local o URL accesible desde backend; o buffer base64
  source: z.object({
    type: z.enum(['path', 'url', 'base64']),
    value: z.string(),
  }),

  // Metadata asociada al documento
  metadata: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      clientId: z.string().optional(),
      contextId: z.string().optional(),
    })
    .optional(),

  // Opcional: cortar por páginas
  pageWise: z.boolean().default(false),
});

const ParsedPageSchema = z.object({
  page: z.number(),
  text: z.string(),
});

const DocumentOutputSchema = z.object({
  ok: z.boolean(),
  action: DocumentActionEnum,
  pages: z.array(ParsedPageSchema).optional(),
  // ids creados en supabase / vector store
  ingestedIds: z.array(z.string()).optional(),
  error: z.string().optional(),
});

// ============================================================================
// 2. IMPLEMENTACIÓN
// ============================================================================

async function parseDocument(
  source: { type: 'path' | 'url' | 'base64'; value: string },
  pageWise: boolean
): Promise<{ pages: { page: number; text: string }[] }> {
  const adapter = (globalThis as any).AURA_DOC_PARSER;

  if (!adapter) {
    throw new Error('Adaptador de documentos (AURA_DOC_PARSER) no configurado.');
  }

  const result = await adapter.parse(source, { pageWise });

  if (!result || !Array.isArray(result.pages)) {
    throw new Error('AURA_DOC_PARSER no devolvió páginas válidas.');
  }

  return { pages: result.pages };
}

async function ingestDocumentPages(
  pages: { page: number; text: string }[],
  metadata: Record<string, any> | undefined
): Promise<string[]> {
  const ids: string[] = [];

  for (const p of pages) {
    const baseMeta = {
      ...metadata,
      page: p.page,
    };

    // 1) Insertar en vector store
    const embedding = await VectorEngine.embedText(p.text);

    const client = SupabaseConnector.getClient();
    const cfg = (VectorEngine as any).config || {
      table: 'documents_embeddings',
      textColumn: 'content',
      embedColumn: 'embedding',
      metadataColumn: 'metadata',
    };

    const row: any = {
      [cfg.textColumn]: p.text,
      [cfg.embedColumn]: embedding,
      ...(cfg.metadataColumn ? { [cfg.metadataColumn]: baseMeta } : {}),
    };

    const { data, error } = await client.from(cfg.table).insert(row).select('id');

    if (error) {
      Logger.error('[document_agent] Error insertando página en vector store', {
        error: error.message,
      });
      continue;
    }

    const newId = data?.[0]?.id;
    if (newId) ids.push(String(newId));
  }

  return ids;
}

async function executeDocumentTool(input: unknown): Promise<any> {
  const parsed = DocumentInputSchema.parse(input);
  const { action, source, metadata, pageWise } = parsed;

  try {
    // 1) PARSE
    const { pages } = await parseDocument(source, pageWise || action !== 'ingest');

    if (action === 'parse') {
      return {
        ok: true,
        action,
        pages,
      };
    }

    // 2) INGEST
    const ingestedIds = await ingestDocumentPages(pages, metadata || {});

    return {
      ok: true,
      action,
      pages: action === 'parse_and_ingest' ? pages : undefined,
      ingestedIds,
    };
  } catch (err: any) {
    Logger.error('[document_agent] Error procesando documento', {
      action,
      error: err.message,
    });
    return {
      ok: false,
      action,
      error: err.message,
    };
  }
}

// ============================================================================
// 3. TOOL EXPORT
// ============================================================================

export const DocumentTool: MCPTool = {
  name: 'document_agent',
  description:
    'Tool interno para parsear documentos (PDF, etc.) y opcionalmente ingerirlos en el vector store para RAG.',
  inputSchema: DocumentInputSchema,
  outputSchema: DocumentOutputSchema,
  execute: executeDocumentTool,
};

export default DocumentTool;
