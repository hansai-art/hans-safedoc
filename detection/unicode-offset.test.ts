import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-004 keeps UTF-16 offsets through emoji and combining text', () => {
  const source = '😀 e\u0301 信箱 a@example.com';
  const result = detectAll(source);
  expect(result.ok && source.slice(result.value[0]!.start, result.value[0]!.end)).toBe(
    'a@example.com',
  );
});
