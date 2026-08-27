import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const outdir = resolve(root, 'dist');

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: [resolve(root, 'src/main.ts')],
  bundle: true,
  external: ['obsidian'],
  format: 'cjs',
  platform: 'node',
  target: 'es2022',
  outfile: resolve(outdir, 'main.js'),
  sourcemap: false,
  minify: true,
  legalComments: 'none',
});
await cp(resolve(root, 'manifest.json'), resolve(outdir, 'manifest.json'));
