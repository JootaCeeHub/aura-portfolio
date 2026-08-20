import axios from 'axios';
import { retry } from '../utils/retry.js';
import { Logger } from '../lib/logger.js';

/**
 * Conector para Microsoft Power Automate
 * Permite disparar flujos HTTP y consumir APIs Microsoft 365
 */
export class PowerAutomateConnector {
  static baseUrl = process.env.POWER_AUTOMATE_URL || '';
  static token = process.env.POWER_AUTOMATE_TOKEN || '';

  static headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  static async triggerFlow(flowId: string, data: any) {
    return retry(async () => {
      Logger.info('PowerAutomate: ejecutando Flow', { flowId });

      const result = await axios.post(`${this.baseUrl}/${flowId}/manual/paths/invoke`, data, {
        headers: this.headers(),
      });

      return result.data;
    });
  }

  static async getFlows() {
    return retry(async () => {
      Logger.info('PowerAutomate: listando Flows');

      const result = await axios.get(`${this.baseUrl}/flows`, {
        headers: this.headers(),
      });

      return result.data;
    });
  }

  static async readSharePointList(site: string, list: string) {
    return retry(async () => {
      Logger.info('PowerAutomate: leyendo SharePoint', { site, list });

      const url = `https://graph.microsoft.com/v1.0/sites/${site}/lists/${list}/items`;

      const result = await axios.get(url, {
        headers: this.headers(),
      });

      return result.data;
    });
  }
}
