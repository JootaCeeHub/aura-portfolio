import { Args, Flags } from '@oclif/core';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AuraCommand } from '../index';

const AGENT_TEMPLATES = {
	simple: `
import { Logger } from '@aura-mcp/core';

export class {{AgentName}}Agent {
  async execute(input: string): Promise<string> {
    Logger.info('{{agentId}}.execute', { input });
    return \`Processed: \${input}\`;
  }
}
`,
	llm: `
import { templateBuilder } from '@aura-mcp/core';

export async function initialize{{AgentName}}(): Promise<string> {
  const systemPrompt = templateBuilder.buildFromTemplate(
    'orchestrator',
    undefined,
    {
      agentId: '{{agentId}}',
      capabilities: ['analyze', 'generate', 'validate']
    }
  );
  return systemPrompt;
}
`,
	reactive: `
import { eventBus } from '@aura-mcp/core';

export function setup{{AgentName}}Listeners(): void {
  eventBus.subscribe('AgentExecutionStarted', (event) => {
    if (event.agentId === '{{agentId}}') {
      console.log('Agent starting:', event.taskId);
    }
  });
}
`,
};

export default class GenerateAgent extends AuraCommand {
	static description = 'Generar un nuevo agente con template';

	static args = {
		// no required args
	};

	static flags = {
		name: Flags.string({ required: true, description: 'Nombre del agente' }),
		type: Flags.string({
			options: ['simple', 'llm', 'reactive'],
			default: 'simple',
			description: 'Tipo de template',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(GenerateAgent);

		const agentName = flags.name;
		const agentType = flags.type as keyof typeof AGENT_TEMPLATES;
		const agentId = agentName.toLowerCase().replace(/\s+/g, '_');
		const AgentName = agentName.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

		const agentDir = join('agents', agentId);
		if (existsSync(agentDir)) {
			this.error(`Agente ${agentId} ya existe`);
		}

		this.log(`🤖 Generando agente: ${agentName}`);

		// Crear directorio
		mkdirSync(agentDir, { recursive: true });

		// Generar código
		const template = AGENT_TEMPLATES[agentType];
		const code = template
			.replace(/{{AgentName}}/g, AgentName)
			.replace(/{{agentId}}/g, agentId)
			.trim();

		writeFileSync(join(agentDir, `${agentId}.ts`), code);

		// Generar test
		writeFileSync(
			join(agentDir, `${agentId}.test.ts`),
			`
import { describe, it, expect } from 'vitest';
import { ${AgentName}Agent } from './${agentId}';

describe('${AgentName}Agent', () => {
  it('ejecuta correctamente', async () => {
    const agent = new ${AgentName}Agent();
    const result = await agent.execute('test input');
    expect(result).toBeDefined();
  });
});
`.trim()
		);

		// Generar config
		writeFileSync(
			join(agentDir, 'agent.config.json'),
			JSON.stringify(
				{
					id: agentId,
					name: agentName,
					type: 'custom',
					version: '0.1.0',
					description: `Custom agent: ${agentName}`,
					tools: [],
					enabled: true,
				},
				null,
				2
			)
		);

		this.log(`✅ Agente creado en agents/${agentId}/`);
		this.log('');
		this.log('Archivos generados:');
		this.log(`  - agents/${agentId}/${agentId}.ts`);
		this.log(`  - agents/${agentId}/${agentId}.test.ts`);
		this.log(`  - agents/${agentId}/agent.config.json`);
	}
}
