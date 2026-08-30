import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';

it('bounds email matching on a very long line without losing valid offsets', () => {
  const email = 'safe@example.invalid';
  const source = `${email}\n${'x'.repeat(1_000_000)}`;
  const result = detectAll(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const match = result.value.find((candidate) => candidate.primaryType === 'EMAIL');
  expect(match?.surfaceText).toBe(email);
  expect(source.slice(match?.start, match?.end)).toBe(email);
});
