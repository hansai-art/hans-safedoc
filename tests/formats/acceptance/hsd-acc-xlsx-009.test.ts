import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { xlsxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-009/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-009 mandatory workbook names', () => {
  it('emits locator-bound review records for sheet, table, column and style names', async () => {
    const source = await readFile(fixture);
    const extraction = xlsxAdapter.extract(source);

    expect(extraction.reviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'sheet-name', value: 'libreoffice-xlsx' }),
        expect.objectContaining({
          kind: 'table-name',
          value: 'SyntheticContacts',
          locator: expect.objectContaining({
            kind: 'xlsx-table-name',
            partName: 'xl/tables/table1.xml',
            tableId: 1,
          }),
        }),
        expect.objectContaining({
          kind: 'table-name',
          value: 'SyntheticEmail',
          mandatoryReview: true,
        }),
        expect.objectContaining({
          kind: 'table-name',
          value: 'TableStyleMedium2',
          mandatoryReview: true,
        }),
      ]),
    );
    expect(xlsxAdapter.residual(source, ['SyntheticContacts', 'SyntheticEmail'])).toEqual([
      'SyntheticContacts',
      'SyntheticEmail',
    ]);
  });
});
