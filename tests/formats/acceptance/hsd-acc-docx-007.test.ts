import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-007/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-007 independent artifact reopen', () => {
  it('reopens rewritten bytes and returns package, graph and entry-hash evidence', async () => {
    const source = await readFile(fixture);
    const extraction = docxAdapter.extract(source);
    const surface = extraction.surfaces.find((item) => item.text.includes('0900-000-001'))!;
    const start = surface.text.indexOf('0900-000-001');
    const artifact = docxAdapter.rewrite(source, [
      {
        locator: { ...surface.locator, logicalStartUtf16: start, logicalEndUtf16: start + 12 },
        replacement: '⟦PB:PHONE:E1:TAG⟧',
      },
    ]);
    const reopened = docxAdapter.reopen(artifact);
    const manifest = docxAdapter.verifyReopen(artifact);
    expect(reopened.surfaces.some((item) => item.text.includes('⟦PB:PHONE:E1:TAG⟧'))).toBe(true);
    expect(manifest).toMatchObject({
      package: 'docx',
      packageSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      relationshipGraphSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(Object.keys(manifest.entryHashes).length).toBeGreaterThan(10);
    expect(docxAdapter.residual(artifact, ['0900-000-001'])).toEqual([]);
  });
});
