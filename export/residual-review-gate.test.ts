import { expect, it } from 'vitest';
import { residualsResolved, scanResidualAll } from '@privacy-bridge/core';

it('ACC-EXP-007: requires a reviewed residual with a non-empty reason before export', () => {
  const residuals = scanResidualAll([{ documentId: 'doc', content: 'email: a@example.com' }]);
  if (!residuals.ok) throw new Error('detector');
  const id = residuals.value[0]!.candidate.candidateId;
  expect(residualsResolved(residuals.value, [{ candidateId: id, accepted: true }])).toBe(false);
  expect(
    residualsResolved(residuals.value, [
      { candidateId: id, accepted: true, reason: 'reviewed safe' },
    ]),
  ).toBe(true);
});
