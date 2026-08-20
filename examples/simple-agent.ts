/**
 * Ejemplo: Agente Simple "Hola Mundo"
 *
 * Este es el agente más simple posible en AURA.
 * Demuestra:
 * - Crear un agente basado en clase
 * - Ejecutar código
 * - Usar Logger
 */

import { Logger } from '../core-aura-mcp/src/lib/logger';

export class HelloWorldAgent {
	/**
	 * Ejecutar agente con input.
	 */
	async execute(input: string): Promise<string> {
		const message = `Hello, ${input || 'World'}!`;

		Logger.info('helloWorldAgent.execute', {
			input,
			output: message,
		});

		return message;
	}
}

// Uso
async function main() {
	const agent = new HelloWorldAgent();

	const result1 = await agent.execute('Alice');
	console.log(result1); // Hello, Alice!

	const result2 = await agent.execute('');
	console.log(result2); // Hello, World!
}

main().catch(console.error);
