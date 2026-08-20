import { Args, Flags } from '@oclif/core';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AuraCommand } from '../index';

export default class Init extends AuraCommand {
	static description = 'Inicializar un nuevo proyecto AURA';

	static args = {
		projectName: Args.string({ required: true, description: 'Nombre del proyecto' }),
	};

	static flags = {
		typescript: Flags.boolean({ description: 'Usar TypeScript', default: true }),
		git: Flags.boolean({ description: 'Inicializar repositorio Git', default: true }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(Init);

		const projectPath = join(process.cwd(), args.projectName);

		// Validar
		if (existsSync(projectPath)) {
			this.error(`Directorio ${projectPath} ya existe`);
		}

		this.log(`📦 Inicializando proyecto: ${args.projectName}`);

		// Crear estructura
		mkdirSync(projectPath, { recursive: true });
		mkdirSync(join(projectPath, 'src'), { recursive: true });
		mkdirSync(join(projectPath, 'agents'), { recursive: true });
		mkdirSync(join(projectPath, 'tests'), { recursive: true });

		// package.json
		writeFileSync(
			join(projectPath, 'package.json'),
			JSON.stringify(
				{
					name: args.projectName,
					version: '0.1.0',
					type: 'module',
					scripts: {
						dev: 'aura dev',
						test: 'aura test:core',
						build: 'tsc',
					},
					dependencies: {
						'@aura-mcp/core': '^1.0.0',
					},
					devDependencies: {
						typescript: '^5.0.0',
						vitest: '^1.0.0',
					},
				},
				null,
				2
			)
		);

		// tsconfig.json
		writeFileSync(
			join(projectPath, 'tsconfig.json'),
			JSON.stringify(
				{
					compilerOptions: {
						target: 'ES2020',
						module: 'ESNext',
						lib: ['ES2020'],
						outDir: './dist',
						rootDir: './src',
						strict: true,
						esModuleInterop: true,
						skipLibCheck: true,
						forceConsistentCasingInFileNames: true,
					},
					include: ['src/**/*', 'agents/**/*'],
				},
				null,
				2
			)
		);

		// README
		writeFileSync(
			join(projectPath, 'README.md'),
			`# ${args.projectName}

AURA MCP Project

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Crear agente

\`\`\`bash
aura generate:agent --name my_agent
\`\`\`
`
		);

		// .aura.config.json
		writeFileSync(
			join(projectPath, '.aura.config.json'),
			JSON.stringify(
				{
					core: {
						port: 3000,
						enableWs: true,
					},
					agents: {
						orchestrator: { enabled: true },
					},
				},
				null,
				2
			)
		);

		this.log(`✅ Proyecto creado en ${projectPath}`);
		this.log('');
		this.log('Próximos pasos:');
		this.log(`  cd ${args.projectName}`);
		this.log('  npm install');
		this.log('  npm run dev');
	}
}
