import axios from 'axios';
import { retry } from '../utils/retry.js';
import { Logger } from '../lib/logger.js';

export class N8NConnector {
  static baseUrl = process.env.N8N_HOST || 'http://localhost:5678';
  static apiKey = process.env.N8N_API_KEY || '';

  /**
   * Lista todos los flujos disponibles en el servidor n8n
   */
  static async listWorkflows() {
    return retry(async () => {
      Logger.info('Conector n8n: listando workflows');

      const result = await axios.get(`${this.baseUrl}/rest/workflows`, {
        headers: { 'X-N8N-API-KEY': this.apiKey },
      });

      return result.data;
    });
  }

  /**
   * Ejecuta un workflow Webhook o Manual
   */
  static async runWorkflow(workflowId: string, payload: any) {
    return retry(async () => {
      Logger.info('Conector n8n: ejecutando workflow', { workflowId });

      const result = await axios.post(`${this.baseUrl}/webhook/${workflowId}`, payload, {
        headers: { 'X-N8N-API-KEY': this.apiKey },
      });

      return result.data;
    });
  }

  /**
   * Obtiene estado de ejecución de un workflow
   */
  static async getExecutionStatus(executionId: string) {
    return retry(async () => {
      Logger.info('Conector n8n: getExecutionStatus', { executionId });

      const result = await axios.get(`${this.baseUrl}/rest/executions/${executionId}`, {
        headers: { 'X-N8N-API-KEY': this.apiKey },
      });

      return result.data;
    });
  }
}
