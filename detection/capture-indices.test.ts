import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-005 captures only label-value right sides', () => {
  const result = detectAll('LINE ID: hans.lin\npassword: secret123');
  expect(result.ok && result.value.map((c) => c.surfaceText)).toEqual(['hans.lin', 'secret123']);
});
