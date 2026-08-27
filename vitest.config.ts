import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'architecture/*.test.ts',
      'ci/*.test.mjs',
      'crypto/*.test.ts',
      'files/*.test.ts',
      'integration/*.test.ts',
      'recovery/*.test.ts',
      'regression/*.test.ts',
      'schema/*.test.ts',
      'security/*.test.ts',
      'store/*.test.ts',
    ],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@privacy-bridge/core': resolve(import.meta.dirname, 'packages/core/src/index.ts'),
      '@privacy-bridge/obsidian-plugin': resolve(
        import.meta.dirname,
        'packages/obsidian-plugin/src/index.ts',
      ),
    },
  },
});
