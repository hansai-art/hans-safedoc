import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { xlsxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-010/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-010 unknown OOXML', () => {
  it('rejects unknown theme elements and leaves source bytes unchanged', async () => {
    const source = await readFile(fixture);
    const before = createHash('sha256').update(source).digest('hex');
    expect(() => xlsxAdapter.extract(source)).toThrow(OoxmlBlockedError);
    expect(createHash('sha256').update(source).digest('hex')).toBe(before);
  });
});
