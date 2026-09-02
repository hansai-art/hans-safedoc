import { describe, expect, it } from 'vitest';
import {
  dictionaryFromCsv,
  dictionaryFromLines,
  dictionaryPreviewWarnings,
} from '../../packages/obsidian-plugin/src/dictionary-import.js';

describe('Hans SafeDoc 1.4 customer dictionary wizard', () => {
  it('builds a validated exact-match dictionary from pasted lines', () => {
    const result = dictionaryFromLines('王小明\n星河科技\n王小明\n', 'PERSON');
    expect(result.ok && result.value.entries).toEqual([
      { term: '王小明', type: 'PERSON', handling: 'TOKENIZE' },
      { term: '星河科技', type: 'PERSON', handling: 'TOKENIZE' },
    ]);
  });

  it('parses CSV aliases and case sensitivity with a preview warning', () => {
    const csv = new TextEncoder().encode(
      'term,type,aliases,caseSensitive\n星河科技股份有限公司,ORGANIZATION,星河科技|Star River,false\n',
    );
    const result = dictionaryFromCsv(csv);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.entries[0]).toMatchObject({
      term: '星河科技股份有限公司',
      type: 'ORGANIZATION',
      aliases: ['星河科技', 'Star River'],
      caseSensitive: false,
    });
    expect(dictionaryPreviewWarnings(result.value)).toContain(
      '包含 2 個 Alias，會和主要名稱對應為同一類型。',
    );
  });

  it('rejects ambiguous conflicting aliases before changing the current dictionary', () => {
    const csv = new TextEncoder().encode(
      'term,type,aliases\n星河科技,ORGANIZATION,星河\n星河計畫,PROJECT,星河\n',
    );
    const result = dictionaryFromCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PB-DICT-CONFLICT');
  });

  it('rejects case-insensitive forms that overlap case-sensitive entries', () => {
    const csv = new TextEncoder().encode(
      'term,type,caseSensitive\nProjectX,PROJECT,true\nprojectx,PRODUCT,false\n',
    );
    const result = dictionaryFromCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PB-DICT-CONFLICT');
  });
});
