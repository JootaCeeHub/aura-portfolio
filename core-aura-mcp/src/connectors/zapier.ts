import axios from 'axios';
import { retry } from '../utils/retry.js';
import { Logger } from '../lib/logger.js';

/**
 * Conector Zapier para Webhooks e Integraciones universales
 */
export class ZapierConnector {
  static async triggerZap(webhookUrl: string, payload: any) {
    return retry(async () => {
      Logger.info('Zapier: disparando webhook', { webhookUrl });

      const result = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      return result.data || { ok: true };
    });
  }

  static async testZap(webhookUrl: string) {
    return retry(async () => {
      Logger.info('Zapier: test webhook', { webhookUrl });

      const result = await axios.post(webhookUrl, { test: true });

      return result.data;
    });
  }
}
