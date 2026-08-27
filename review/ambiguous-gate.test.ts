import { expect, it } from 'vitest';
import { evaluateExportGuard } from '@privacy-bridge/core';
it('ACC-REV-010 blocks READY_TO_BUILD export flow for unresolved ambiguity', () => {
  const result = evaluateExportGuard({
    inventoryResolved: true,
    sourceSnapshotCurrent: true,
    allCandidatesDecided: false,
    unresolvedAmbiguity: true,
    unresolvedBlock: false,
    secureDataEncrypted: true,
    shadowComplete: true,
    residualResolved: true,
    pathIntegrity: true,
    manifestValid: true,
    packageHashComplete: true,
    auditCommitted: true,
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.reasons).toContain('PB-REVIEW-002');
});
