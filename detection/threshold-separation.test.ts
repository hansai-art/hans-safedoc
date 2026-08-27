import { expect, it } from 'vitest';
import { scanResidualAll } from '@privacy-bridge/core';
it('ACC-DET-002 retains low-score candidates in core residual scanning', () => {
  const result = scanResidualAll([{ documentId: 'one', content: '郵遞區號：123' }]);
  expect(result.ok && result.value[0]?.candidate.ruleScore).toBeLessThan(0.7);
  expect(result.ok && result.value).toHaveLength(1);
});
