import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: [
			'tests/**/*.test.ts',
			'core-aura-mcp/tests/**/*.test.ts',
			'core-aura-mcp/src/**/*.test.ts'
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary', 'html', 'json', 'json-summary', 'lcov'],
			reportOnFailure: true,
			all: true,
			exclude: [
				'node_modules/',
				'dist/',
				'coverage/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/types.ts'
			],
			lines: 70,
			functions: 70,
			branches: 65,
			statements: 70
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@core': path.resolve(__dirname, './core-aura-mcp/core'),
			'@lib': path.resolve(__dirname, './core-aura-mcp/src/lib'),
			'@services': path.resolve(__dirname, './core-aura-mcp/ui/src/services')
		}
	}
});
