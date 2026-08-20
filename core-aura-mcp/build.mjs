import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['agents/*', '@langchain/*', 'langchain'],
  outfile: 'dist/main.js',
  logLevel: 'info',
});
