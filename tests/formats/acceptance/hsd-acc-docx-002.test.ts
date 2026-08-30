import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-002/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-002 supported document surfaces', () => {
  it('inventories body, table, header, footer, notes, comments and links for rewrite or mandatory review', async () => {
    const source = await readFile(fixture);
    const extraction = docxAdapter.extract(source);
    for (const part of [
      'word/document.xml',
      'word/header1.xml',
      'word/footer1.xml',
      'word/footnotes.xml',
      'word/comments.xml',
    ])
      expect(extraction.surfaces.some((surface) => surface.part === part)).toBe(true);
    expect(extraction.reviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'comment-author', value: '測試審核員' }),
        expect.objectContaining({ kind: 'hyperlink', value: 'mailto:case.alpha@example.invalid' }),
      ]),
    );

    const target = extraction.surfaces.find((surface) => surface.text.includes('0900-000-001'))!;
    const start = target.text.indexOf('0900-000-001');
    const artifact = docxAdapter.rewrite(source, [
      {
        locator: { ...target.locator, logicalStartUtf16: start, logicalEndUtf16: start + 12 },
        replacement: '⟦PB:PHONE:E1:TAG⟧',
      },
    ]);
    expect(docxAdapter.residual(artifact, ['0900-000-001'])).toEqual([]);
    expect(docxAdapter.residual(artifact, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
  });
});
