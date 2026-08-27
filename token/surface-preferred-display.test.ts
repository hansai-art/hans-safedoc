import { expect, it } from 'vitest';
import { preferredDisplay } from '@privacy-bridge/core';
it('ACC-TOK-004 retains a preferred source display across phone surfaces', () => {
  const result = preferredDisplay(['02-2712-3456', '(02) 2712-3456', '0227123456']);
  expect(result.ok && result.value).toBe('(02) 2712-3456');
});
