import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OoxmlBlockedError, xlsxAdapter } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-006/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-006 unsupported data features', () => {
  it.each([
    ['xl/connections.xml', '<connections/>'],
    ['xl/externalLinks/externalLink1.xml', '<externalLink/>'],
    ['xl/pivotTables/pivotTable1.xml', '<pivotTableDefinition/>'],
    ['xl/queryTables/queryTable1.xml', '<queryTable/>'],
    ['xl/slicerCaches/slicerCache1.xml', '<slicerCache/>'],
  ])('blocks %s before extraction', async (part, xml) => {
    const entries = readZip(await readFile(fixture));
    entries.push({ name: part, data: Buffer.from(xml), method: 0, crc: 0 });
    expect(() => xlsxAdapter.extract(writeZip(entries))).toThrow(OoxmlBlockedError);
  });
});
