import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-019 captures exact email, IPv4, URL and LINE values', () => {
  const result = detectAll(
    'email: a@example.com 192.168.1.1 https://example.com LINE ID: hans.lin',
  );
  expect(result.ok && result.value.map((c) => c.surfaceText)).toEqual([
    'a@example.com',
    '192.168.1.1',
    'https://example.com',
    'hans.lin',
  ]);
});
