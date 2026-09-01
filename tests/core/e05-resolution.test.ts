import { describe, expect, it } from 'vitest';
import {
  detectAll,
  matchDictionary,
  mergeCandidateDetections,
  mergeDictionaries,
  validateDictionaryImport,
} from '@privacy-bridge/core';
describe('E05 dictionary safety', () => {
  it('uses NFC exact longest matches without fuzzy matching', () => {
    const result = matchDictionary('星河科技股份有限公司與星河技術', {
      entries: [
        { term: '星河', type: 'ORGANIZATION' as never },
        { term: '星河科技股份有限公司', type: 'ORGANIZATION' as never },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.surfaceText).toBe('星河科技股份有限公司');
    expect(result.some((match) => match.surfaceText === '星河技術')).toBe(false);
  });
  it('maps NFC matches back to the exact original UTF-16 span', () => {
    const source = '前e\u0301後';
    const result = matchDictionary(source, {
      entries: [{ term: 'é', type: 'PRODUCT' }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ start: 1, end: 3, surfaceText: 'e\u0301' });
    expect(source.slice(result[0]!.start, result[0]!.end)).toBe(result[0]!.surfaceText);
  });
  it('uses job override and rejects invalid whole imports', () => {
    expect(
      mergeDictionaries(
        { entries: [{ term: 'A', type: 'PERSON' }] },
        { entries: [{ term: 'A', type: 'ORGANIZATION' }] },
      ).entries[0]!.type,
    ).toBe('ORGANIZATION');
    expect(
      validateDictionaryImport(
        new TextEncoder().encode(
          JSON.stringify({ entries: [{ term: 'x'.repeat(257), type: 'PERSON' }] }),
        ),
      ).ok,
    ).toBe(false);
  });
  it('validates the simple import contract and never downgrades a blocking rule', () => {
    expect(
      validateDictionaryImport(
        new TextEncoder().encode(JSON.stringify({ entries: [{ term: '王小明' }] })),
      ).ok,
    ).toBe(false);
    expect(
      validateDictionaryImport(
        new TextEncoder().encode(
          JSON.stringify({
            entries: [{ term: '王小明', type: 'PERSON', handling: 'TOKENIZE' }],
          }),
        ),
      ).ok,
    ).toBe(true);

    const source = 'password: correct-horse-battery-staple';
    const fixed = detectAll(source);
    expect(fixed.ok).toBe(true);
    if (!fixed.ok) return;
    const custom = matchDictionary(source, {
      entries: [
        {
          term: 'correct-horse-battery-staple',
          type: 'CUSTOM_TERM',
          handling: 'TOKENIZE',
        },
      ],
    });
    const merged = mergeCandidateDetections(fixed.value, custom);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.handling).toBe('BLOCK_EXPORT');
    expect(merged[0]?.primaryType).toBe('SECRET');
    expect(merged[0]?.matchedRules).toEqual(
      expect.arrayContaining(['dictionary-exact', 'secret-assignment']),
    );
  });
  it('does not let a short dictionary term hide a longer fixed-rule finding', () => {
    const source = 'demo@example.invalid';
    const fixed = detectAll(source);
    if (!fixed.ok) throw new Error(fixed.error.code);
    const custom = matchDictionary(source, {
      entries: [{ term: 'demo', type: 'PERSON' }],
    });
    const merged = mergeCandidateDetections(fixed.value, custom);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      primaryType: 'EMAIL',
      surfaceText: source,
      start: 0,
      end: source.length,
    });
  });
});
