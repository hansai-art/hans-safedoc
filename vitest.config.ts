import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
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
