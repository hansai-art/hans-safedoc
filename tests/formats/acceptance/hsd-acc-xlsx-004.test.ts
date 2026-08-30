import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { xlsxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-004/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-004 formulas and caches', () => {
  it('fails closed with formula and cached-result locators before rewrite', async () => {
    const source = await readFile(fixture);
    const before = createHash('sha256').update(source).digest('hex');
    try {
      xlsxAdapter.extract(source);
      expect.unreachable('formula workbook must be blocked');
    } catch (error) {
      expect(error).toBeInstanceOf(OoxmlBlockedError);
      expect((error as OoxmlBlockedError).evidence.map((item) => item.locator?.kind)).toEqual(
        expect.arrayContaining(['xlsx-formula', 'xlsx-cached-result']),
      );
    }
    expect(createHash('sha256').update(source).digest('hex')).toBe(before);
  });
});
