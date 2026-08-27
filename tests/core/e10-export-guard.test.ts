import { describe, expect, it } from 'vitest';
import { evaluateExportGuard, residualsResolved, scanResidualAll } from '@privacy-bridge/core';
describe('E10 residual and export guard', () =>
  it('blocks low-score residuals and returns every gate reason', () => {
    const residuals = scanResidualAll([
      { documentId: 'document', content: 'email: a@example.com' },
    ]);
    expect(residuals.ok && residuals.value.length).toBeGreaterThan(0);
    if (!residuals.ok) return;
    expect(
      residualsResolved(residuals.value, [
        { candidateId: residuals.value[0]!.candidate.candidateId, accepted: true },
      ]),
    ).toBe(false);
    const gate = evaluateExportGuard({
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
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.error.reasons).toHaveLength(12);
  }));
