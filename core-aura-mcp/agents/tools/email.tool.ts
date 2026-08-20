/**
 * email.tool.ts — AURA-MCP
 * ================================================================================
 * Tool interno: email_agent
 *
 * Responsabilidades:
 *  - Enviar emails
 *  - Crear borradores
 *  - Listar últimos correos de una bandeja (simple)
 *
 * Se espera un adaptador global:
 *   globalThis.AURA_EMAIL:
 *     - sendEmail
 *     - createDraft
 *     - listEmails
 */

import { z } from 'zod';
import { Logger } from '../../lib/logger.js';

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

const EmailActionEnum = z.enum(['send', 'draft', 'list']);

const EmailMessageSchema = z.object({
  from: z.string().optional(), // se puede tomar del contexto
  to: z.array(z.string()).nonempty(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(), // base64
        contentType: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional(),
});

const EmailListFilterSchema = z.object({
  limit: z.number().default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  subjectContains: z.string().optional(),
});

const EmailInputSchema = z.object({
  action: EmailActionEnum,
  message: EmailMessageSchema.optional(),
  filters: EmailListFilterSchema.optional(),
});

const EmailOutputSchema = z.object({
  ok: z.boolean(),
  action: EmailActionEnum,
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  messages: z.array(z.any()).optional(),
  error: z.string().optional(),
});

// ============================================================================
// 2. IMPLEMENTACIÓN
// ============================================================================

async function executeEmailTool(input: unknown, context: any = {}): Promise<any> {
  const parsed = EmailInputSchema.parse(input);
  const adapter = (globalThis as any).AURA_EMAIL;

  if (!adapter) {
    Logger.error('[email_agent] AURA_EMAIL adapter no definido.');
    return {
      ok: false,
      action: parsed.action,
      error: 'Adaptador de email no configurado (AURA_EMAIL).',
    };
  }

  try {
    if (parsed.action === 'send') {
      if (!parsed.message) {
        return {
          ok: false,
          action: parsed.action,
          error: "Falta 'message' para acción send.",
        };
      }

      const result = await adapter.sendEmail(parsed.message, context);
      return {
        ok: true,
        action: parsed.action,
        messageId: result.messageId,
        threadId: result.threadId,
      };
    }

    if (parsed.action === 'draft') {
      if (!parsed.message) {
        return {
          ok: false,
          action: parsed.action,
          error: "Falta 'message' para acción draft.",
        };
      }

      const result = await adapter.createDraft(parsed.message, context);
      return {
        ok: true,
        action: parsed.action,
        messageId: result.messageId,
        threadId: result.threadId,
      };
    }

    if (parsed.action === 'list') {
      const messages = await adapter.listEmails(parsed.filters || {}, context);
      return {
        ok: true,
        action: parsed.action,
        messages,
      };
    }

    return {
      ok: false,
      action: parsed.action,
      error: 'Acción no soportada.',
    };
  } catch (err: any) {
    Logger.error('[email_agent] Error ejecutando acción', {
      action: parsed.action,
      error: err.message,
    });
    return {
      ok: false,
      action: parsed.action,
      error: err.message,
    };
  }
}

// ============================================================================
// 3. TOOL EXPORT
// ============================================================================

export const EmailTool: MCPTool = {
  name: 'email_agent',
  description:
    'Tool interno para enviar emails, crear borradores y listar correos usando AURA_EMAIL.',
  inputSchema: EmailInputSchema,
  outputSchema: EmailOutputSchema,
  execute: executeEmailTool,
};

export default EmailTool;
