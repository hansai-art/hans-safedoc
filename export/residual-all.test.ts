import { expect, it } from 'vitest';
import { scanResidualAll } from '@privacy-bridge/core';

it('ACC-EXP-006: scans every residual candidate without a UI threshold parameter', () => {
  const result = scanResidualAll([{ documentId: 'doc', content: 'email: a@example.com' }]);
  expect(
    result.ok &&
      result.value.some((residual) => residual.candidate.surfaceText === 'a@example.com'),
  ).toBe(true);
});
