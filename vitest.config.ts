import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.ts',
      'architecture/*.test.ts',
      'ci/*.test.mjs',
      'crypto/*.test.ts',
      'detection/*.test.ts',
      'dictionary/*.test.ts',
      'files/*.test.ts',
      'fuzz/*.test.ts',
      'handling/*.test.ts',
      'integration/*.test.ts',
      'mapping/*.test.ts',
      'recovery/*.test.ts',
      'regression/*.test.ts',
      'review/*.test.ts',
      'schema/*.test.ts',
      'security/*.test.ts',
      'store/*.test.ts',
      'token/*.test.ts',
      'ui/*.test.ts',
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
