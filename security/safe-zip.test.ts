import { expect, it } from 'vitest';
import { normalizeSafeEntryPath } from '@privacy-bridge/core';

it('ACC-EXP-009: rejects ZIP-slip, absolute, backslash and symlink-like entry paths', () => {
  for (const path of ['../x', '/x', 'C:\\x', 'a/../b', 'a//b', ''])
    expect(normalizeSafeEntryPath(path).ok).toBe(false);
  expect(normalizeSafeEntryPath('documents/safe.md')).toEqual({
    ok: true,
    value: 'documents/safe.md',
  });
});
