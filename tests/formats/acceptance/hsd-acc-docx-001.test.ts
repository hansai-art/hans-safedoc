import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';
import { readZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-001/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-001 cross-run rewrite', () => {
  it('rewrites the logical value while preserving run structure and style bytes', async () => {
    const source = await readFile(fixture);
    const extraction = docxAdapter.extract(source);
    const surface = extraction.surfaces.find((item) => item.text.includes('0900-000-001'))!;
    const start = surface.text.indexOf('0900-000-001');
    expect(surface.locator.runSlices.length).toBeGreaterThan(1);

    const artifact = docxAdapter.rewrite(source, [
      {
        locator: { ...surface.locator, logicalStartUtf16: start, logicalEndUtf16: start + 12 },
        replacement: '⟦PB:PHONE:E1:TAG⟧',
      },
    ]);
    const reopened = docxAdapter.reopen(artifact);
    expect(reopened.surfaces.some((item) => item.text.includes('⟦PB:PHONE:E1:TAG⟧'))).toBe(true);
    expect(docxAdapter.residual(artifact, ['0900-000-001'])).toEqual([]);

    const before = new Map(readZip(source).map((entry) => [entry.name, entry.data]));
    const after = new Map(readZip(artifact).map((entry) => [entry.name, entry.data]));
    expect(after.get('word/styles.xml')).toEqual(before.get('word/styles.xml'));
  });
});
