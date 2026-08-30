import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { xlsxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-008/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-008 independent reopen and structure preservation', () => {
  it('preserves merged ranges and style indexes after a locator-bound rewrite', async () => {
    const source = await readFile(fixture);
    const extraction = xlsxAdapter.extract(source);
    const cell = extraction.cells.find((item) =>
      item.value.includes('case.alpha@example.invalid'),
    )!;
    const originalMerged = extraction.mergedCells;
    const originalFormat = { numberFormat: cell.numberFormat, numberFormatId: cell.numberFormatId };
    const artifact = xlsxAdapter.rewrite(source, [
      { locator: cell.locator, replacement: '⟦PB:EMAIL:E1:TAG⟧' },
    ]);
    const reopened = xlsxAdapter.reopen(artifact);
    expect(reopened.mergedCells).toEqual(originalMerged);
    expect(
      reopened.cells.find((item) => item.cell === cell.cell && item.sheetRelId === cell.sheetRelId),
    ).toMatchObject(originalFormat);
    const manifest = xlsxAdapter.verifyReopen(artifact);
    expect(manifest).toMatchObject({
      package: 'xlsx',
      packageSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      relationshipGraphSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(xlsxAdapter.residual(artifact, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
  });
});
