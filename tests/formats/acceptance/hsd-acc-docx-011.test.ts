import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-011/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-011 admitted package closure', () => {
  it('admits a synthetic LibreOffice package and binds every review item to its source surface', async () => {
    const source = await readFile(fixture);
    const extraction = docxAdapter.extract(source);
    expect(extraction.surfaces.length).toBeGreaterThan(0);
    expect(extraction.reviewItems.length).toBeGreaterThan(0);
    expect(
      extraction.reviewItems.every((item) =>
        /^[a-f0-9]{64}$/u.test(item.locator.sourceSurfaceHashSha256),
      ),
    ).toBe(true);
    expect(Object.keys(docxAdapter.verifyReopen(source).entryHashes)).toEqual(
      expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']),
    );
  });
});
