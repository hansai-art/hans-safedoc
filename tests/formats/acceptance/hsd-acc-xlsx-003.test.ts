import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { xlsxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-003/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-003 formatted numeric identifiers', () => {
  it('exposes raw and display values and rewrites the selected cell as text', async () => {
    const source = await readFile(fixture);
    const extraction = xlsxAdapter.extract(source);
    const phone = extraction.cells.find((cell) => cell.cell === 'B2')!;
    expect(phone).toMatchObject({
      rawValue: '900000001',
      displayValue: '0900-000-001',
      candidatePolicy: 'formatted-identifier',
      locator: expect.objectContaining({ kind: 'xlsx-display-value' }),
    });

    const artifact = xlsxAdapter.rewrite(source, [
      { locator: phone.locator, replacement: '⟦PB:PHONE:E1:TAG⟧' },
    ]);
    expect(xlsxAdapter.reopen(artifact).cells.find((cell) => cell.cell === 'B2')).toMatchObject({
      value: '⟦PB:PHONE:E1:TAG⟧',
      valueKind: 'inline',
      candidatePolicy: 'text',
    });
    expect(xlsxAdapter.residual(artifact, ['900000001', '0900-000-001'])).toEqual([]);
  });
});
