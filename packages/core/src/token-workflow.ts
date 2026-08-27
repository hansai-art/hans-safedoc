import { aesGcmDecrypt, aesGcmEncrypt, err, error, ok, tokenFor, type Result } from './index.js';
import { canonicalize, createEntityId } from './tokenization.js';
import type { CandidateType, DetectedCandidate } from './detection.js';

export interface EntityTokenInput {
  readonly type: CandidateType;
  readonly value: string;
}
export interface EntityTokenAssignment extends EntityTokenInput {
  readonly canonical: string;
  readonly entityId: string;
  readonly token: string;
}
export function assignEntityTokens(
  key: Uint8Array,
  jobId: string,
  inputs: readonly EntityTokenInput[],
): readonly EntityTokenAssignment[] {
  const byCanonical = new Map<string, EntityTokenAssignment>();
  return inputs.map((input) => {
    const canonical = canonicalize(input.type, input.value);
    const mapKey = `${input.type}\u0000${canonical}`;
    const existing = byCanonical.get(mapKey);
    if (existing) return { ...existing, value: input.value };
    const entityId = createEntityId();
    const assignment = {
      ...input,
      canonical,
      entityId,
      token: tokenFor(key, jobId, input.type, entityId),
    };
    byCanonical.set(mapKey, assignment);
    return assignment;
  });
}

export function preferredDisplay(values: readonly string[]): Result<string> {
  if (values.length === 0) return err(error('PB-TOKEN-002'));
  return ok([...values].sort((a, b) => b.length - a.length || a.localeCompare(b))[0]!);
}

export function validateCandidateHandling(
  candidate: Pick<DetectedCandidate, 'primaryType' | 'handling'>,
  requested: 'TOKENIZE' | 'REDACT' | 'EXCLUDE' | 'BLOCK_EXPORT',
): Result<typeof requested> {
  const irreversible =
    candidate.primaryType === 'SECRET' || candidate.primaryType === 'CREDIT_CARD';
  return irreversible && requested === 'TOKENIZE' ? err(error('PB-DET-010')) : ok(requested);
}

export function encryptMappingRecord(
  key: Uint8Array,
  mapping: Readonly<Record<string, string>>,
): Uint8Array {
  const aad = new TextEncoder().encode('PrivacyBridge|mapping|v1');
  const envelope = aesGcmEncrypt(key, new TextEncoder().encode(JSON.stringify(mapping)), aad);
  return new TextEncoder().encode(
    JSON.stringify({
      iv: Buffer.from(envelope.iv).toString('base64url'),
      ciphertext: Buffer.from(envelope.ciphertext).toString('base64url'),
      authTag: Buffer.from(envelope.authTag).toString('base64url'),
    }),
  );
}

export function decryptMappingRecord(
  key: Uint8Array,
  record: Uint8Array | undefined,
): Result<Readonly<Record<string, string>>> {
  if (!record) return err(error('PB-BACKUP-002'));
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(record)) as Record<
      string,
      string
    >;
    const aad = new TextEncoder().encode('PrivacyBridge|mapping|v1');
    const plain = aesGcmDecrypt(
      key,
      {
        iv: new Uint8Array(Buffer.from(parsed.iv!, 'base64url')),
        ciphertext: new Uint8Array(Buffer.from(parsed.ciphertext!, 'base64url')),
        authTag: new Uint8Array(Buffer.from(parsed.authTag!, 'base64url')),
      },
      aad,
    );
    return ok(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)) as Record<string, string>,
    );
  } catch {
    return err(error('PB-BACKUP-002'));
  }
}
