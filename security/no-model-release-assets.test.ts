import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const forbiddenPaths = [
  'model-training',
  'packages/obsidian-plugin/model-catalog.json',
  'packages/obsidian-plugin/model-LICENSES.txt',
  'packages/obsidian-plugin/src/embedded-onnx-runtime.ts',
  'packages/obsidian-plugin/src/local-model-inference.ts',
  'packages/obsidian-plugin/src/local-model-manager.ts',
  'packages/obsidian-plugin/src/local-model-runtime.ts',
  'packages/obsidian-plugin/src/pinned-model-downloader.ts',
  'scripts/build-local-model-package.mjs',
];

describe('model-free release source', () => {
  it('contains no model distribution source, dependency, or bundle capability', () => {
    expect(forbiddenPaths.filter((path) => existsSync(resolve(root, path)))).toEqual([]);

    const packageMetadata = readFileSync(resolve(root, 'package.json'), 'utf8');
    const pluginMetadata = readFileSync(
      resolve(root, 'packages/obsidian-plugin/package.json'),
      'utf8',
    );
    const main = readFileSync(resolve(root, 'packages/obsidian-plugin/src/main.ts'), 'utf8');
    const bundle = readFileSync(resolve(root, 'packages/obsidian-plugin/dist/main.js'), 'utf8');

    for (const source of [packageMetadata, pluginMetadata, main, bundle]) {
      expect(source).not.toMatch(
        /onnxruntime|huggingface|\.hsmodel|model_int8|installPinnedModel|installOfflineModel|LocalModelRuntime/u,
      );
    }
  });
});
