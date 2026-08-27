import { describe, expect, it } from 'vitest';
import { createPathMap } from '@privacy-bridge/core';

describe('ACC-FIL-010 path collision', () => {
  it('blocks case and Unicode-normalization collisions before Shadow build', () => {
    expect(
      createPathMap([
        { documentId: 'one', relativePath: 'Client.md' },
        { documentId: 'two', relativePath: 'client.md' },
      ]).error?.code,
    ).toBe('PB-FILE-006');
    expect(
      createPathMap([
        { documentId: 'one', relativePath: 'é.md' },
        { documentId: 'two', relativePath: 'e\u0301.md' },
      ]).ok,
    ).toBe(false);
  });
});
