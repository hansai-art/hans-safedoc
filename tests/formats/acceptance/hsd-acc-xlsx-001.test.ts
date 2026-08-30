import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { xlsxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-001/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-001 shared-string isolation', () => {
  it('changes only the selected cell when two cells reference one shared string', async () => {
    const source = await readFile(fixture);
    const extraction = xlsxAdapter.extract(source);
    const target = extraction.cells.find((cell) => cell.cell === 'B2')!;
    const canary = extraction.cells.find((cell) => cell.cell === 'E2')!;
    expect(target.valueKind).toBe('shared');
    expect(canary.value).toBe(target.value);

    const artifact = xlsxAdapter.rewrite(source, [
      { locator: target.locator, replacement: '⟦PB:EMAIL:E1:TAG⟧' },
    ]);
    const reopened = xlsxAdapter.reopen(artifact);
    expect(reopened.cells.find((cell) => cell.cell === 'B2')?.value).toBe('⟦PB:EMAIL:E1:TAG⟧');
    expect(reopened.cells.find((cell) => cell.cell === 'E2')?.value).toBe(canary.value);
    expect(xlsxAdapter.verifyArtifact(source, artifact).changedEntries).toEqual([
      'xl/worksheets/sheet1.xml',
    ]);
  });
});
