import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-006/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-006 hostile ZIP paths', () => {
  it('rejects OPC path traversal before extraction', async () => {
    const entries = readZip(await readFile(fixture));
    entries.push({ name: '../escape.xml', data: Buffer.from('<escape/>'), method: 0, crc: 0 });
    const hostile = writeZip(entries);
    expect(() => docxAdapter.extract(hostile)).toThrow(OoxmlBlockedError);
  });
});
