import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-008/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-008 full-entry residual oracle', () => {
  it('finds values in headers, footnotes, comments and relationship targets', async () => {
    const source = await readFile(fixture);
    for (const value of [
      '0900-000-003',
      'audit.owner@example.invalid',
      'case.alpha@example.invalid',
    ])
      expect(docxAdapter.residual(source, [value]), value).toEqual([value]);
  });
});
