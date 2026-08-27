import { expect, it } from 'vitest';
import { evaluateExportGuard } from '@privacy-bridge/core';

it('ACC-EXP-008: reports every independently failed export precondition', () => {
  const result = evaluateExportGuard({
    inventoryResolved: false,
    sourceSnapshotCurrent: false,
    allCandidatesDecided: false,
    unresolvedAmbiguity: true,
    unresolvedBlock: true,
    secureDataEncrypted: false,
    shadowComplete: false,
    residualResolved: false,
    pathIntegrity: false,
    manifestValid: false,
    packageHashComplete: false,
    auditCommitted: false,
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.reasons).toHaveLength(12);
});
