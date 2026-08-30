import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-005/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-005 media decisions', () => {
  it('inventories embedded media as a pending mandatory decision', async () => {
    const source = await readFile(fixture);
    const entries = readZip(source);
    const relationships = entries.find((entry) => entry.name === 'word/_rels/document.xml.rels')!;
    relationships.data = Buffer.from(
      relationships.data
        .toString('utf8')
        .replace(
          '</Relationships>',
          '<Relationship Id="rIdSyntheticImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>',
        ),
    );
    const contentTypes = entries.find((entry) => entry.name === '[Content_Types].xml')!;
    if (!contentTypes.data.toString('utf8').includes('Extension="png"'))
      contentTypes.data = Buffer.from(
        contentTypes.data
          .toString('utf8')
          .replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>'),
      );
    entries.push({
      name: 'word/media/image1.png',
      data: Buffer.from('89504e470d0a1a0a', 'hex'),
      method: 0,
      crc: 0,
    });
    const artifact = writeZip(entries);
    const extraction = docxAdapter.extract(artifact);
    expect(extraction.media).toEqual([
      expect.objectContaining({
        part: 'word/media/image1.png',
        decision: 'pending',
        mandatoryReview: true,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    ]);
  });
});
