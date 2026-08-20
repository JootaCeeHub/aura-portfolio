/**
 * Ejemplo: Agente Calculadora
 *
 * Demuestra:
 * - Validación de input
 * - Manejo de errores
 * - Logging estructurado
 * - Uso de templates
 */

import { templateBuilder } from '../core-aura-mcp/src/AgentPromptInjector';
import { Logger } from '../core-aura-mcp/src/lib/logger';

interface CalculationInput {
	operation: 'add' | 'subtract' | 'multiply' | 'divide';
	a: number;
	b: number;
}

export class CalculatorAgent {
	/**
	 * Obtener prompt del agente.
	 */
	async getSystemPrompt(): Promise<string> {
		return templateBuilder.buildFromTemplate('developer', undefined, {
			role: 'Calculadora',
			capabilities: ['add', 'subtract', 'multiply', 'divide'],
		});
	}

	/**
	 * Ejecutar cálculo.
	 */
	async execute(input: CalculationInput): Promise<{ result: number; explanation: string }> {
		// Validar
		if (!input.operation || typeof input.a !== 'number' || typeof input.b !== 'number') {
			throw new Error('Invalid input: missing operation, a, or b');
		}

		Logger.info('calculatorAgent.execute.start', { operation: input.operation, a: input.a, b: input.b });

		let result: number;
		let explanation: string;

		try {
			switch (input.operation) {
				case 'add':
					result = input.a + input.b;
					explanation = `${input.a} + ${input.b} = ${result}`;
					break;
				case 'subtract':
					result = input.a - input.b;
					explanation = `${input.a} - ${input.b} = ${result}`;
					break;
				case 'multiply':
					result = input.a * input.b;
					explanation = `${input.a} × ${input.b} = ${result}`;
					break;
				case 'divide':
					if (input.b === 0) throw new Error('Division by zero');
					result = input.a / input.b;
					explanation = `${input.a} ÷ ${input.b} = ${result}`;
					break;
			}

			Logger.info('calculatorAgent.execute.success', { result, explanation });

			return { result, explanation };
		} catch (err) {
			Logger.error('calculatorAgent.execute.failed', {
				operation: input.operation,
				error: (err as Error).message,
			});
			throw err;
		}
	}
}

// Uso
async function main() {
	const agent = new CalculatorAgent();

	try {
		const result = await agent.execute({ operation: 'add', a: 5, b: 3 });
		console.log(result); // { result: 8, explanation: "5 + 3 = 8" }
	} catch (err) {
		console.error('Error:', err);
	}
}

main();
