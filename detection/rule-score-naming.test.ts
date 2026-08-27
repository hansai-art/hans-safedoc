import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-003 returns a rule score as a detector result', () => {
  const result = detectAll('a@example.com');
  expect(result.ok && result.value[0]).toMatchObject({ ruleScore: 0.97 });
});
