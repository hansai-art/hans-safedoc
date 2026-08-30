import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

describe('DOCX safe subset', () => {
  it('accepts the frozen LibreOffice common theme but keeps it in mandatory review', async () => {
    const source = await readFile(new URL('common-libreoffice.docx', corpus));
    const extraction = docxAdapter.extract(source);

    expect(extraction.surfaces.some((surface) => surface.text.includes('0900-000-011'))).toBe(true);
    expect(extraction.manualReview).toContain('word/theme/theme1.xml');
  });

  it('fails closed for an unknown element inside an otherwise common theme', async () => {
    const source = await readFile(new URL('blocked-unknown-theme.docx', corpus));
    expect(() => docxAdapter.extract(source)).toThrow(OoxmlBlockedError);
  });

  it('extracts cross-run text, locally rewrites, independently reopens and scans residual', async () => {
    const source = await readFile(new URL('messy-minimal.docx', corpus));
    const before = Buffer.from(source);
    const extraction = docxAdapter.extract(source);
    const needle = '0900-000-001';
    const surface = extraction.surfaces.find((x) => x.text.includes(needle))!;
    const start = surface.text.indexOf(needle);
    const artifact = docxAdapter.rewrite(source, [
      {
        locator: {
          ...surface.locator,
          logicalStartUtf16: start,
          logicalEndUtf16: start + needle.length,
        },
        replacement: '⟦PB:PHONE:E1:TAG⟧',
      },
    ]);
    expect(source).toEqual(before);
    const reopened = docxAdapter.reopen(artifact);
    expect(reopened.surfaces.some((x) => x.text.includes('⟦PB:PHONE:E1:TAG⟧'))).toBe(true);
    expect(docxAdapter.residual(artifact, ['0900-000-001'])).toEqual([]);
  });

  it.each(['blocked-tracked-changes.docx'])('fails closed for %s', async (name) => {
    const source = await readFile(new URL(name, corpus));
    expect(() => docxAdapter.extract(source)).toThrow(OoxmlBlockedError);
  });
});
