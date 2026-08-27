import { describe, expect, it } from 'vitest';
import { normalizeRelativePath } from '@privacy-bridge/core';

describe('ACC-FIL-009 path boundary', () => {
  it('accepts only normalized relative paths inside the approved root', () => {
    expect(normalizeRelativePath('folder/note.md')).toMatchObject({
      ok: true,
      value: 'folder/note.md',
    });
    for (const path of [
      '../secret.md',
      '/absolute.md',
      'C:\\device.md',
      'folder/../note.md',
      'a//b.md',
    ])
      expect(normalizeRelativePath(path).ok).toBe(false);
  });
});
