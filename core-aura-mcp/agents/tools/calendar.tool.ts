/**
 * calendar.tool.ts — AURA-MCP
 * ================================================================================
 * Tool interno: calendar_agent
 *
 * Responsabilidades:
 *  - Listar eventos del calendario
 *  - Crear nuevos eventos
 *  - Actualizar eventos simples
 *
 * No acopla a un proveedor específico:
 *  - Se espera que exista un adaptador en globalThis.AURA_CALENDAR
 *    con métodos: listEvents, createEvent, updateEvent
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

const CalendarActionEnum = z.enum(['list', 'create', 'update']);

const CalendarEventSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  start: z.string(), // ISO8601
  end: z.string(), // ISO8601
  timezone: z.string().default('America/Santiago'),
  attendees: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

const CalendarInputSchema = z.object({
  action: CalendarActionEnum,
  event: CalendarEventSchema.partial().optional(),
  filters: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

const CalendarOutputSchema = z.object({
  ok: z.boolean(),
  action: CalendarActionEnum,
  events: z.array(CalendarEventSchema).optional(),
  event: CalendarEventSchema.optional(),
  error: z.string().optional(),
});

// ============================================================================
// 2. IMPLEMENTACIÓN
// ============================================================================

async function executeCalendarTool(input: unknown, context: any = {}): Promise<any> {
  const parsed = CalendarInputSchema.parse(input);
  const action = parsed.action;

  const adapter = (globalThis as any).AURA_CALENDAR;

  if (!adapter) {
    Logger.error('[calendar_agent] AURA_CALENDAR adapter no definido.');
    return {
      ok: false,
      action,
      error: 'Adaptador de calendario no configurado (AURA_CALENDAR).',
    };
  }

  try {
    if (action === 'list') {
      const events = await adapter.listEvents(parsed.filters || {}, context);
      return {
        ok: true,
        action,
        events,
      };
    }

    if (action === 'create') {
      if (!parsed.event) {
        return {
          ok: false,
          action,
          error: "Falta 'event' para acción create.",
        };
      }

      const created = await adapter.createEvent(parsed.event, context);
      return {
        ok: true,
        action,
        event: created,
      };
    }

    if (action === 'update') {
      if (!parsed.event?.id) {
        return {
          ok: false,
          action,
          error: "Falta 'event.id' para acción update.",
        };
      }

      const updated = await adapter.updateEvent(parsed.event, context);
      return {
        ok: true,
        action,
        event: updated,
      };
    }

    return {
      ok: false,
      action,
      error: 'Acción no soportada.',
    };
  } catch (err: any) {
    Logger.error('[calendar_agent] Error ejecutando acción', {
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

export const CalendarTool: MCPTool = {
  name: 'calendar_agent',
  description:
    'Tool interno para gestionar eventos de calendario (listar, crear, actualizar) a través de AURA_CALENDAR.',
  inputSchema: CalendarInputSchema,
  outputSchema: CalendarOutputSchema,
  execute: executeCalendarTool,
};

export default CalendarTool;
