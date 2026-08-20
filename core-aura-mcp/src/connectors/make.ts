import axios from 'axios';
import { retry } from '../utils/retry.js';
import { Logger } from '../lib/logger.js';

/**
 * Conector oficial Make.com (Integromat)
 *
 * Funcionalidades:
 *  - Disparar Webhooks
 *  - Ejecutar Módulos Make vía HTTP
 *  - Recibir respuestas enriquecidas
 */
export class MakeConnector {
  static baseUrl = process.env.MAKE_WEBHOOK_BASE || '';

  /**
   * Ejecuta un webhook de Make.com
   */
  static async triggerWebhook(webhookId: string, payload: any) {
    return retry(async () => {
      const url = `${this.baseUrl}/${webhookId}`;

      Logger.info('Make.com: ejecutando Webhook', { webhookId });

      const result = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return result.data || { ok: true };
    });
  }

  /**
   * Ejecuta módulos genéricos (Make Modules)
   */
  static async runModule(url: string, input: any) {
    return retry(async () => {
      Logger.info('Make.com: ejecutando módulo HTTP', { moduleUrl: url });

      const result = await axios.post(url, input, {
        headers: { 'Content-Type': 'application/json' },
      });

      return result.data;
    });
  }

  /**
   * Test rápido del Webhook
   */
  static async test(webhookId: string) {
    return this.triggerWebhook(webhookId, { test: true });
  }
}
