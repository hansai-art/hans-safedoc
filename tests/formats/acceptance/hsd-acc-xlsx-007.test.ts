import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OoxmlBlockedError, xlsxAdapter } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/xlsx/hsd-acc-xlsx-007/input.xlsx', import.meta.url);

describe('HSD-ACC-XLSX-007 visual content', () => {
  it.each([
    ['xl/drawings/drawing1.xml', '<wsDr/>'],
    ['xl/charts/chart1.xml', '<chartSpace/>'],
    ['xl/media/image1.png', 'PNG'],
  ])('blocks %s with no degraded export path', async (part, content) => {
    const entries = readZip(await readFile(fixture));
    entries.push({ name: part, data: Buffer.from(content), method: 0, crc: 0 });
    expect(() => xlsxAdapter.extract(writeZip(entries))).toThrow(OoxmlBlockedError);
  });
});
