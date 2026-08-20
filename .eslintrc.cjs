module.exports = {
	root: true,
	env: {
		node: true,
		es2021: true,
		browser: true
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier' // debe ir al final para desactivar conflictos con Prettier
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
		project: './tsconfig.json',
		tsconfigRootDir: __dirname
	},
	plugins: ['@typescript-eslint', 'import'],
	rules: {
		// TypeScript
		'@typescript-eslint/explicit-function-return-types': [
			'warn',
			{
				allowExpressions: true,
				allowTypedFunctionExpressions: true,
				allowHigherOrderFunctions: true
			}
		],
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'explicit' }],
		'@typescript-eslint/naming-convention': [
			'warn',
			{
				selector: 'default',
				format: ['camelCase'],
				leadingUnderscore: 'allow',
				trailingUnderscore: 'allow'
			},
			{
				selector: 'variable',
				format: ['camelCase', 'UPPER_CASE'],
				leadingUnderscore: 'allow'
			},
			{
				selector: 'typeLike',
				format: ['PascalCase']
			},
			{
				selector: 'enumMember',
				format: ['UPPER_CASE']
			}
		],

		// General
		'no-console': 'off',
		'no-debugger': 'warn',
		'prefer-const': 'warn',
		'no-var': 'error',
		'eqeqeq': ['warn', 'always'],

		// Import
		'import/no-unresolved': 'error',
		'import/order': [
			'warn',
			{
				groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				alphabeticalOrder: true,
				'newlines-between': 'always'
			}
		],
		'sort-imports': 'off', // usar import/order en su lugar
		'import/no-extraneous-dependencies': 'off'
	},
	ignorePatterns: ['dist', 'build', 'node_modules', 'coverage', '**/*.d.ts', '.env', '.env.local'],
	overrides: [
		{
			files: ['tests/**/*.ts', 'scripts/**/*.ts', 'packages/**/src/**/*.ts'],
			rules: { '@typescript-eslint/no-var-requires': 'off' }
		}
	]
};
