import { Command, Flags } from '@oclif/core';
import { spawn } from 'child_process';
import chalk from 'chalk';

export default class Debug extends Command {
	static description = 'Iniciar Core con Node debugger (breakpoints)';

	static flags = {
		port: Flags.integer({ default: 3000, description: 'Puerto para Core' }),
		inspectPort: Flags.integer({ default: 9229, description: 'Puerto para inspector' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Debug);

		this.log(chalk.cyan('🐛 AURA Debug Mode'));
		this.log('');
		this.log(chalk.yellow('Inspector disponible en:'));
		this.log(`  chrome://devtools/bundled/js_app.html?ws=127.0.0.1:${flags.inspectPort}/...`);
		this.log('');
		this.log(chalk.yellow('O via VSCode:'));
		this.log(chalk.gray(`
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Core",
  "port": ${flags.inspectPort}
}
      `));
		this.log('');

		const debugProcess = spawn('node', [
			`--inspect=${flags.inspectPort}`,
			'--enable-source-maps',
			'dist/server.js',
		], {
			env: {
				...process.env,
				PORT: String(flags.port),
				NODE_ENV: 'development',
			},
			stdio: 'inherit',
		});

		process.on('SIGINT', () => {
			debugProcess.kill();
			process.exit(0);
		});

		debugProcess.on('exit', (code) => {
			process.exit(code ?? 0);
		});
	}
}
