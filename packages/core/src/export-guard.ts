import { detectAll, type DetectedCandidate } from './detection.js';
import { type PBError, error, err, ok, type Result } from './index.js';

export interface Residual {
  readonly documentId: string;
  readonly candidate: DetectedCandidate;
}
export interface ResidualDecision {
  readonly candidateId: string;
  readonly accepted: boolean;
  readonly reason?: string;
}
/** Deliberately has no threshold parameter: every detector hit is export-relevant. */
export function scanResidualAll(
  documents: readonly { documentId: string; content: string }[],
): Result<readonly Residual[]> {
  const residuals: Residual[] = [];
  for (const document of documents) {
    const found = detectAll(document.content);
    if (!found.ok) return err(found.error);
    residuals.push(
      ...found.value.map((candidate) => ({ documentId: document.documentId, candidate })),
    );
  }
  return ok(residuals);
}
export function residualsResolved(
  residuals: readonly Residual[],
  decisions: readonly ResidualDecision[],
): boolean {
  const byId = new Map(decisions.map((decision) => [decision.candidateId, decision]));
  return residuals.every((residual) => {
    const decision = byId.get(residual.candidate.candidateId);
    return (
      decision?.accepted === true &&
      typeof decision.reason === 'string' &&
      decision.reason.trim().length > 0
    );
  });
}
export interface ExportGateInput {
  readonly inventoryResolved: boolean;
  readonly sourceSnapshotCurrent: boolean;
  readonly allCandidatesDecided: boolean;
  readonly unresolvedAmbiguity: boolean;
  readonly unresolvedBlock: boolean;
  readonly secureDataEncrypted: boolean;
  readonly shadowComplete: boolean;
  readonly residualResolved: boolean;
  readonly pathIntegrity: boolean;
  readonly manifestValid: boolean;
  readonly packageHashComplete: boolean;
  readonly auditCommitted: boolean;
}
const checks: readonly [keyof ExportGateInput, string][] = [
  ['inventoryResolved', 'PB-FILE-001'],
  ['sourceSnapshotCurrent', 'PB-FILE-004'],
  ['allCandidatesDecided', 'PB-REVIEW-001'],
  ['unresolvedAmbiguity', 'PB-REVIEW-002'],
  ['unresolvedBlock', 'PB-EXPORT-001'],
  ['secureDataEncrypted', 'PB-STORE-003'],
  ['shadowComplete', 'PB-EXPORT-003'],
  ['residualResolved', 'PB-EXPORT-002'],
  ['pathIntegrity', 'PB-FILE-005'],
  ['manifestValid', 'PB-SCHEMA-001'],
  ['packageHashComplete', 'PB-EXPORT-005'],
  ['auditCommitted', 'PB-AUDIT-001'],
];
export function evaluateExportGuard(
  input: ExportGateInput,
): Result<true, PBError & { readonly reasons: readonly string[] }> {
  const reasons = checks
    .filter(([field]) =>
      field === 'unresolvedAmbiguity'
        ? input[field]
        : field === 'unresolvedBlock'
          ? input[field]
          : !input[field],
    )
    .map(([, code]) => code);
  return reasons.length
    ? { ok: false, error: { ...error(reasons[0]!), reasons } }
    : { ok: true, value: true };
}
