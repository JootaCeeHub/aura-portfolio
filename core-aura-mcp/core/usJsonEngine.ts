/**
 * uiJsonEngine.ts — AURA-MCP
 * ================================================================================
 * Motor UI JSON-Driven del ecosistema AURA-MCP.
 *
 * Basado directamente en la sección “JSON-driven UI & content_blocks”
 * de la Plantilla Maestra MCP+IA.
 *
 * Funciones principales:
 *   ✔ Generar pantallas dinámicas según módulo
 *   ✔ Unir (merge) diferentes content_blocks
 *   ✔ Validar estructura UI (según blueprint)
 *   ✔ Permitir UI generada por IA (autoLayout)
 *   ✔ Adjuntar metadata, acciones y resume_url
 *
 * Alineado con:
 *   - Plantilla Mcp Ia Modular.pdf
 *       • content_blocks (L18-L81)
 *       • reglas de UI JSON-driven (L21-L31)
 */

import { Logger } from '../src/lib/logger.js';
import { McpModuleBlueprint } from './mcpModuleBlueprint.js';

// ============================================================================
// 1. Tipos UI estándar (extraídos del PDF)
// ============================================================================

export type UIContentBlock =
  | {
      type: 'text';
      content: string;
      style?: string;
    }
  | {
      type: 'input';
      id: string;
      label: string;
      input_type: string; // text, number, email, textarea
      placeholder?: string;
      required?: boolean;
      value?: any;
    }
  | {
      type: 'button';
      id: string;
      label: string;
      action: string; // acción que activará el módulo/AI
      style?: string;
    }
  | {
      type: 'file_upload';
      id: string;
      label: string;
      accept: string[]; // ej: ["pdf", "jpg"]
      max_files?: number;
    }
  | {
      type: 'select';
      id: string;
      label: string;
      options: { label: string; value: string }[];
      placeholder?: string;
      required?: boolean;
      value?: string;
    }
  | {
      type: 'container';
      blocks: UIContentBlock[];
      style?: string;
    };

// Respuesta UI completa
export interface UIResponse {
  screen_title: string;
  subtitle?: string;
  content_blocks: UIContentBlock[];
  theme?: string;
  resume_url?: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// 2. Motor principal
// ============================================================================

export class UIJsonEngine {
  /**
   * Genera una UI desde un blueprint de módulo MCP.
   * Usa:
   *   blueprint.architecture.uiResponseContract
   */
  static fromBlueprint(blueprint: McpModuleBlueprint): UIResponse | null {
    try {
      const contract = blueprint.architecture.uiResponseContract;

      if (!contract) {
        Logger.warn('[UIJsonEngine] El módulo no define interfaz UI');
        return null;
      }

      // Validación ligera
      if (!Array.isArray(contract.content_blocks)) {
        Logger.error('[UIJsonEngine] content_blocks inválidos');
        return null;
      }

      return {
        screen_title: contract.screen_title,
        subtitle: contract.subtitle,
        theme: contract.theme,
        content_blocks: contract.content_blocks,
        resume_url: contract.resume_url || null,
        metadata: contract.metadata || {},
      };
    } catch (err: any) {
      Logger.error('[UIJsonEngine] Error generando UI', {
        error: err.message,
      });
      return null;
    }
  }

  /**
   * Genera UI dinámica desde texto + IA (autoLayout).
   * AURA interpreta el contenido del usuario y construye pantallas.
   */
  static async fromAi(title: string, text: string, context: any = {}): Promise<UIResponse> {
    Logger.info('[UIJsonEngine] Generando UI autoLayout con IA...');

    // prompt simple (en producción usarías systemPrompt + AURA_TOOLKIT)
    const generated = await global.AURA_MODEL.invoke({
      model: 'gpt-4o-mini',
      prompt: `
        Eres el motor UI de AURA.
        Convierte este texto en content_blocks JSON coherentes.

        Texto:
        ${text}

        Devuelve sólo JSON, sin explicaciones.
      `,
    });

    let blocks: UIContentBlock[] = [];
    try {
      blocks = JSON.parse(generated).content_blocks;
    } catch {
      blocks = [
        {
          type: 'text',
          content: text,
        },
      ];
    }

    return {
      screen_title: title,
      content_blocks: blocks,
      metadata: { source: 'ai-generated', context },
    };
  }

  /**
   * Fusión (merge) de dos respuestas UI.
   * Útil cuando un agente produce parte de la UI y otro agente agrega bloques.
   */
  static merge(uiA: UIResponse, uiB: UIResponse): UIResponse {
    return {
      ...uiA,
      content_blocks: [...uiA.content_blocks, ...uiB.content_blocks],
      metadata: {
        ...(uiA.metadata || {}),
        ...(uiB.metadata || {}),
      },
      resume_url: uiB.resume_url || uiA.resume_url || null,
    };
  }

  /**
   * Composición avanzada:
   *   UI(CONTAINER) ← BLOCKS
   */
  static wrapInContainer(title: string, blocks: UIContentBlock[], style: string = ''): UIResponse {
    return {
      screen_title: title,
      content_blocks: [
        {
          type: 'container',
          style,
          blocks,
        },
      ],
    };
  }

  /**
   * Inserta un bloque en una posición específica.
   */
  static insertBlock(ui: UIResponse, block: UIContentBlock, index: number): UIResponse {
    const newBlocks = [...ui.content_blocks];
    newBlocks.splice(index, 0, block);

    return {
      ...ui,
      content_blocks: newBlocks,
    };
  }

  /**
   * Reemplaza un bloque según ID.
   */
  static replaceBlock(ui: UIResponse, blockId: string, newBlock: UIContentBlock): UIResponse {
    return {
      ...ui,
      content_blocks: ui.content_blocks.map((b: any) => (b.id === blockId ? newBlock : b)),
    };
  }

  /**
   * Adjunta o reemplaza resume_url.
   */
  static attachResumeUrl(ui: UIResponse, resumeUrl: string): UIResponse {
    return {
      ...ui,
      resume_url: resumeUrl,
    };
  }

  /**
   * Validación superficial de UI para debug.
   */
  static validate(ui: UIResponse): boolean {
    if (!ui.screen_title) return false;
    if (!Array.isArray(ui.content_blocks)) return false;
    return true;
  }
}

export default UIJsonEngine;
