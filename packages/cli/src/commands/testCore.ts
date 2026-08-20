import { Command, Flags } from '@oclif/core';
import { spawn } from 'child_process';
import chalk from 'chalk';

export default class TestCore extends Command {
	static description = 'Ejecutar test suite con cobertura';

	static flags = {
		watch: Flags.boolean({ description: 'Modo watch' }),
		coverage: Flags.boolean({ default: true, description: 'Mostrar cobertura' }),
		ui: Flags.boolean({ description: 'Abrir UI de resultados' }),
	};

	static args = {
		pattern: { required: false, description: 'Patrón de archivos de test (ej: metrics)' },
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(TestCore);

		this.log(chalk.cyan('🧪 AURA Test Suite'));
		this.log('');

		const args_ = ['test'];

		if (args.pattern) {
			args_.push(args.pattern);
		}

		if (flags.watch) {
			args_.push('--watch');
		}

		if (flags.coverage) {
			args_.push('--coverage');
		}

		if (flags.ui) {
			args_.push('--ui');
		}

		const testProcess = spawn('vitest', args_, {
			stdio: 'inherit',
		});

		testProcess.on('exit', (code) => {
			if (code === 0) {
				this.log('');
				this.log(chalk.green('✅ Todos los tests pasaron'));
			} else {
				this.log('');
				this.log(chalk.red('❌ Algunos tests fallaron'));
			}
			process.exit(code ?? 0);
		});
	}
}
