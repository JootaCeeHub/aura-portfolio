import axios from 'axios';
import { retry } from './retry.js';

let failureCount = 0;
const failureThreshold = 5;

export async function postJSON(url: string, payload: any) {
  if (failureCount >= failureThreshold) {
    throw new Error('Circuit breaker activo: demasiados fallos al llamar MCP');
  }

  return retry(async () => {
    try {
      const res = await axios.post(url, payload, { timeout: 7000 });
      failureCount = 0;
      return res.data;
    } catch (err) {
      failureCount++;
      throw err;
    }
  });
}
