import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OoxmlBlockedError, xlsxAdapter } from '@privacy-bridge/document-formats';

const admitted = new URL(
  '../../fixtures/formats/xlsx/hsd-acc-xlsx-002/input.xlsx',
  import.meta.url,
);
const comments = new URL(
  '../../fixtures/formats/xlsx/hsd-acc-xlsx-002/blocked-comments.xlsx',
  import.meta.url,
);

describe('HSD-ACC-XLSX-002 hidden sheets and links', () => {
  it('inventories inline values from visible, hidden and veryHidden sheets plus links', async () => {
    const source = await readFile(admitted);
    const extraction = xlsxAdapter.extract(source);
    expect(new Set(extraction.sheets.map((sheet) => sheet.state))).toEqual(
      new Set(['visible', 'hidden', 'veryHidden']),
    );
    expect(extraction.cells.some((cell) => cell.sheetState === 'hidden')).toBe(true);
    expect(extraction.cells.some((cell) => cell.sheetState === 'veryHidden')).toBe(true);
    expect(extraction.reviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'hyperlink',
          value: 'mailto:case.alpha@example.invalid',
          mandatoryReview: true,
        }),
      ]),
    );
    expect(xlsxAdapter.residual(source, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
  });

  it('blocks comments before any rewrite path', async () => {
    const source = await readFile(comments);
    expect(() => xlsxAdapter.extract(source)).toThrow(OoxmlBlockedError);
  });
});
