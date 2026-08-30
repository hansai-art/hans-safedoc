import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-004/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-004 active and external content', () => {
  it.each([
    ['word/vbaProject.bin', 'MACRO'],
    ['word/embeddings/oleObject1.bin', 'OLE'],
    ['word/attachedTemplate.xml', '<attachedTemplate/>'],
    ['_xmlsignatures/sig1.xml', '<Signature/>'],
    ['customXml/item1.xml', '<privateData/>'],
  ])('blocks %s before any rewrite or output', async (part, content) => {
    const source = await readFile(fixture);
    const entries = readZip(source);
    entries.push({ name: part, data: Buffer.from(content), method: 0, crc: 0 });
    const hostile = writeZip(entries);
    expect(() => docxAdapter.extract(hostile)).toThrow(OoxmlBlockedError);
    expect(() => docxAdapter.rewrite(hostile, [])).toThrow(OoxmlBlockedError);
  });
});
