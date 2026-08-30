import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { xlsxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-011/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-011 zero-replacement formula workbook', () => {
  it('blocks extraction and empty rewrites with locator evidence and no source mutation', async () => {
    const source = await readFile(fixture);
    const before = createHash('sha256').update(source).digest('hex');
    for (const action of [
      () => xlsxAdapter.extract(source),
      () => xlsxAdapter.rewrite(source, []),
    ]) {
      try {
        action();
        expect.unreachable('formula workbook must be blocked even with zero replacements');
      } catch (error) {
        expect(error).toBeInstanceOf(OoxmlBlockedError);
        expect(
          (error as OoxmlBlockedError).evidence.some(
            (item) => item.locator?.kind === 'xlsx-formula',
          ),
        ).toBe(true);
      }
    }
    expect(createHash('sha256').update(source).digest('hex')).toBe(before);
  });
});
