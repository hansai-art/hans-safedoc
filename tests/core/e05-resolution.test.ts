import { describe, expect, it } from 'vitest';
import { matchDictionary, mergeDictionaries, validateDictionaryImport } from '@privacy-bridge/core';
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
});
