import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createEntityId,
  escapeResultMarkdown,
  restoreText,
  tokenFor,
  validateResultBytes,
} from '@privacy-bridge/core';
describe('E12 Result restore', () =>
  it('escapes hostile Markdown and restores only known tokens', () => {
    const key = randomBytes(32),
      token = tokenFor(key, 'job', 'PERSON', createEntityId());
    expect(escapeResultMarkdown('<script>obsidian://x</script>')).not.toContain('<');
    expect(restoreText(token, [{ token, preferredDisplay: 'Alice' }]).ok).toBe(true);
  }));

describe('ACC-IMP-003 ACC-IMP-005 Result all-or-nothing guards', () =>
  it('rejects forged text tokens and evidence references before returning a package', () => {
    const key = randomBytes(32),
      jobId = 'PB-20260828-0123456789',
      documentId = '123e4567-e89b-42d3-a456-426614174000';
    const token = tokenFor(key, jobId, 'PERSON', createEntityId());
    const value = {
      schemaVersion: '1.0.0',
      jobId,
      sourcePackageHash: 'a'.repeat(64),
      createdAt: '2026-08-28T00:00:00.000Z',
      producer: 'test',
      findings: [
        {
          findingId: '223e4567-e89b-42d3-a456-426614174000',
          entityRefs: [token],
          category: 'test',
          summary: `${token.slice(0, -2)}X⟧`,
          sourceDocumentIds: [documentId],
          evidence: [{ documentId: '323e4567-e89b-42d3-a456-426614174000', excerpt: 'safe' }],
        },
      ],
    };
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const result = validateResultBytes(bytes, {
      jobId,
      packageHash: 'a'.repeat(64),
      tokenKey: key,
      documentIds: new Set([documentId]),
      knownTokens: new Set([token]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PB-IMPORT-003');
  }));
