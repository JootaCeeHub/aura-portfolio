import { Command, Flags } from '@oclif/core';
import { spawn } from 'child_process';
import { watch } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

export default class Dev extends Command {
	static description = 'Iniciar servidor de desarrollo con HMR';

	static flags = {
		port: Flags.integer({ default: 3000, description: 'Puerto para Core' }),
		devtoolsPort: Flags.integer({ default: 9999, description: 'Puerto para Devtools' }),
		debug: Flags.boolean({ description: 'Habilitar debug mode' }),
		watch: Flags.boolean({ default: true, description: 'Habilitar HMR' }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);

		this.log(chalk.cyan('🚀 AURA Dev Server'));
		this.log('');

		const coreProcess = spawn('npm', ['run', 'dev:core'], {
			env: {
				...process.env,
				PORT: String(flags.port),
				DEVTOOLS_PORT: String(flags.devtoolsPort),
				DEBUG: flags.debug ? 'true' : 'false',
			},
			stdio: 'inherit',
		});

		const spinner = ora('Esperando cambios...').start();

		// HMR: detectar cambios en prompts y recargar
		if (flags.watch) {
			const watchDirs = ['agents', 'src'];
			const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

			watchDirs.forEach((dir) => {
				watch(dir, { recursive: true }, (eventType, filename) => {
					if (!filename || filename.endsWith('.test.ts') || filename.endsWith('.swp')) return;

					const key = `${dir}:${filename}`;

					// Debounce: evitar múltiples reloads en cambios rápidos
					clearTimeout(debounceTimers.get(key));
					debounceTimers.set(
						key,
						setTimeout(() => {
							spinner.text = chalk.green(`✨ HMR: ${filename} modificado`);

							// Enviar señal a Core para hot-reload
							if (coreProcess.pid) {
								process.kill(coreProcess.pid, 'SIGHUP');
							}

							spinner.text = 'Esperando cambios...';
						}, 300)
					);
				});
			});
		}

		coreProcess.on('exit', (code) => {
			spinner.stop();
			process.exit(code ?? 0);
		});

		process.on('SIGINT', () => {
			spinner.stop();
			coreProcess.kill();
			process.exit(0);
		});
	}
}
