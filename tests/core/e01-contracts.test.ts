import { describe, expect, it } from 'vitest';
import {
  canonicalStringify,
  decodeCrockfordBase32,
  encodeCrockfordBase32,
  parseCandidate,
  parseClientProfile,
  parseExportManifest,
  parseJob,
  parseResultPackage,
  parseSemVer,
  parseStore,
  validateUtf16Span,
} from '@privacy-bridge/core';
import store from '../../examples/store.example.json' with { type: 'json' };
import client from '../../examples/client-profile.example.json' with { type: 'json' };
import job from '../../examples/job.example.json' with { type: 'json' };
import candidate from '../../examples/candidate.example.json' with { type: 'json' };
import manifest from '../../examples/export-manifest.example.json' with { type: 'json' };
import result from '../../examples/result-package.example.json' with { type: 'json' };

describe('E01 schema contracts', () => {
  it('accepts the locked 1.0.0 examples', () => {
    for (const [parser, value] of [
      [parseStore, store],
      [parseClientProfile, client],
      [parseJob, job],
      [parseCandidate, candidate],
      [parseExportManifest, manifest],
      [parseResultPackage, result],
    ] as const)
      expect(parser(value).ok).toBe(true);
  });

  it('rejects unsupported schema versions and unknown fields', () => {
    expect(parseStore({ ...store, schemaVersion: '1.0.1' }).ok).toBe(false);
    expect(parseResultPackage({ ...result, leaked: 'no' }).ok).toBe(false);
  });

  it('canonicalizes object keys without changing string Unicode', () => {
    expect(canonicalStringify({ z: 'e\u0301', a: [2, 1] })).toBe('{"a":[2,1],"z":"é"}');
  });

  it('round trips Crockford Base32 and rejects ambiguous input', () => {
    const bytes = new Uint8Array([0, 1, 254, 255]);
    expect(decodeCrockfordBase32(encodeCrockfordBase32(bytes))).toEqual(bytes);
    expect(() => decodeCrockfordBase32('O1')).toThrow();
  });

  it('uses UTF-16 offsets and validates boundaries', () => {
    expect(validateUtf16Span('A😀B', { start: 1, end: 3 }).ok).toBe(true);
    expect(validateUtf16Span('A😀B', { start: 2, end: 3 }).ok).toBe(false);
  });

  it('parses only exact semantic versions', () => {
    expect(parseSemVer('1.0.0').ok).toBe(true);
    expect(parseSemVer('1.0.0-beta').ok).toBe(false);
  });
});
