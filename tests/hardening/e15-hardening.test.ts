import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  detectAll,
  importPbJobBackup,
  validateResultBytes,
  type DetectedCandidate,
} from '@privacy-bridge/core';

describe('E15 security and property hardening', () => {
  it('ACC-DET-020: detector never throws and emits valid UTF-16 spans for adversarial Unicode', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'grapheme', maxLength: 2 }),
        fc.integer({ min: 0, max: 150 }),
        (unit, count) => {
          const source = `${unit.repeat(count)}\n密碼：not-a-real-secret\n${unit.repeat(count)}`;
          const detected = detectAll(source);
          expect(detected.ok).toBe(true);
          if (!detected.ok) return;
          for (const candidate of detected.value as readonly DetectedCandidate[]) {
            expect(candidate.start).toBeGreaterThanOrEqual(0);
            expect(candidate.end).toBeGreaterThan(candidate.start);
            expect(candidate.end).toBeLessThanOrEqual(source.length);
            expect(source.slice(candidate.start, candidate.end)).toBe(candidate.surfaceText);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('ACC-IMP-008: malformed and oversized Result payloads fail closed without parsing a result', () => {
    const expected = {
      jobId: 'PB-20260828-0123456789',
      packageHash: 'a'.repeat(64),
      tokenKey: new Uint8Array(32),
      documentIds: new Set<string>(),
    };
    expect(validateResultBytes(new Uint8Array(25 * 1024 * 1024 + 1), expected).ok).toBe(false);
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 4096 }), (bytes) => {
        expect(validateResultBytes(bytes, expected).ok).toBe(false);
      }),
      { numRuns: 250 },
    );
  });

  it('ACC-OPS-005: arbitrary archive bytes never throw or yield an imported job', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ maxLength: 4096 }), async (bytes) => {
        const result = await importPbJobBackup(bytes, 'correct horse battery staple');
        expect(result.ok).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
