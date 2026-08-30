import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OoxmlBlockedError, xlsxAdapter } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-005/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-005 formula classes', () => {
  it.each([
    ['normal', '<f>SUM(1,2)</f>'],
    ['array', '<f t="array" ref="B2:B2">SUM(1,2)</f>'],
    ['shared-master', '<f t="shared" si="0" ref="B2:B2">SUM(1,2)</f>'],
    ['shared-follower', '<f t="shared" si="0"></f>'],
    ['data-table', '<f t="dataTable" ref="B2:B2">TABLE(A1,)</f>'],
    ['normal', "<f>cmd|' /C calc'!A0</f>"],
  ] as const)('blocks %s formula evidence before extraction', async (expectedKind, replacement) => {
    const entries = readZip(await readFile(fixture));
    const sheet = entries.find((entry) => /^xl\/worksheets\/sheet\d+\.xml$/u.test(entry.name))!;
    sheet.data = Buffer.from(
      sheet.data.toString('utf8').replace(/<f\b[^>]*>[\s\S]*?<\/f>/u, replacement),
    );
    try {
      xlsxAdapter.extract(writeZip(entries));
      expect.unreachable('formula workbook must be blocked');
    } catch (error) {
      expect(error).toBeInstanceOf(OoxmlBlockedError);
      expect((error as OoxmlBlockedError).evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            locator: expect.objectContaining({ kind: 'xlsx-formula', formulaKind: expectedKind }),
          }),
        ]),
      );
    }
  });
});
