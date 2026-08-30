import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';
import { readZip, writeZip } from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

describe('Gate 3 DOCX production evidence', () => {
  it('creates hash-bound typed text locators for body, table, header, footer and footnote runs', async () => {
    const source = await readFile(new URL('messy-minimal.docx', corpus));
    const extraction = docxAdapter.extract(source);

    for (const needle of [
      '0900-000-001',
      '0900 000 002',
      '頁首：不存在測試科技股份有限公司',
      'PROJECT-SYNTHETIC-ALPHA',
      '0900-000-003',
    ]) {
      const surface = extraction.surfaces.find((candidate) => candidate.text.includes(needle));
      expect(surface, needle).toBeDefined();
      expect(surface!.locator.sourceSurfaceHashSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(surface!.locator.mapSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(surface!.locator.runSlices.length).toBeGreaterThan(0);
    }
  });

  it('extracts comment author/body, core/app metadata and hyperlink target into mandatory review', async () => {
    const source = await readFile(new URL('messy-minimal.docx', corpus));
    const extraction = docxAdapter.extract(source);

    expect(extraction.reviewItems.some((item) => item.value.includes('測試審核員'))).toBe(true);
    expect(
      extraction.surfaces.some((surface) => surface.text.includes('audit.owner@example.invalid')),
    ).toBe(true);
    expect(extraction.reviewItems.some((item) => item.value.includes('王測試'))).toBe(true);
    expect(extraction.reviewItems.some((item) => item.value.includes('不存在測試科技'))).toBe(true);
    expect(extraction.hyperlinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: 'mailto:case.alpha@example.invalid',
          mandatoryReview: true,
        }),
      ]),
    );
  });

  it('inventories style display names as locator-bound mandatory review and residual surfaces', async () => {
    const source = await readFile(new URL('messy-minimal.docx', corpus));
    const extraction = docxAdapter.extract(source);
    const style = extraction.reviewItems.find((item) => item.value === '合成敏感樣式');

    expect(style).toMatchObject({
      kind: 'style-name',
      part: 'word/styles.xml',
      mandatoryReview: true,
      locator: {
        kind: 'ooxml-attribute-value',
        package: 'docx',
        partName: 'word/styles.xml',
        attributeQName: 'w:val',
      },
    });
    expect(docxAdapter.residual(source, ['合成敏感樣式'])).toEqual(['合成敏感樣式']);
  });

  it('never creates a media auto-accept decision', async () => {
    const source = await readFile(new URL('common-libreoffice.docx', corpus));
    const extraction = docxAdapter.extract(source);
    expect(
      extraction.media.every((media) => media.mandatoryReview && media.decision === 'pending'),
    ).toBe(true);
  });

  it('inventories each media part with hash, MIME, dimensions, relationship and a pending manual decision', async () => {
    const source = await readFile(new URL('common-libreoffice.docx', corpus));
    const entries = readZip(source);
    const png = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 3,
    ]);
    const withMedia = writeZip(
      entries
        .map((entry) => {
          if (entry.name === 'word/_rels/document.xml.rels')
            return {
              ...entry,
              data: Buffer.from(
                entry.data
                  .toString('utf8')
                  .replace(
                    '</Relationships>',
                    '<Relationship Id="rIdSyntheticImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/synthetic.png"/></Relationships>',
                  ),
              ),
            };
          return entry;
        })
        .concat([{ name: 'word/media/synthetic.png', data: png, method: 0, crc: 0 }]),
    );

    expect(docxAdapter.extract(withMedia).media).toEqual([
      expect.objectContaining({
        part: 'word/media/synthetic.png',
        mime: 'image/png',
        dimensions: { width: 2, height: 3 },
        mandatoryReview: true,
        decision: 'pending',
        relationships: [expect.objectContaining({ relationshipId: 'rIdSyntheticImage' })],
      }),
    ]);
  });

  it('rewrites only a hash-bound run slice then performs independent reopen, residual and byte canaries', async () => {
    const source = await readFile(new URL('messy-minimal.docx', corpus));
    const extraction = docxAdapter.extract(source);
    const surface = extraction.surfaces.find((candidate) =>
      candidate.text.includes('0900-000-001'),
    )!;
    const start = surface.text.indexOf('0900-000-001');
    const artifact = docxAdapter.rewrite(source, [
      {
        locator: { ...surface.locator, logicalStartUtf16: start, logicalEndUtf16: start + 12 },
        replacement: '⟦PB:PHONE:E1:TAG⟧',
      },
    ]);

    const reopened = docxAdapter.reopen(artifact);
    expect(
      reopened.surfaces.some((candidate) => candidate.text.includes('⟦PB:PHONE:E1:TAG⟧')),
    ).toBe(true);
    expect(
      docxAdapter.residual(artifact, [{ needle: '0900-000-001', decision: 'replace' }]),
    ).toEqual([]);
    expect(docxAdapter.verifyArtifact(source, artifact).unchangedEntries).toContain(
      'docProps/core.xml',
    );
    expect(docxAdapter.verifyReopen(artifact)).toMatchObject({
      package: 'docx',
      entryCount: extraction.entryCount,
      relationshipGraphSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      packageSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      entryHashes: expect.objectContaining({
        'word/document.xml': expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    });
  });
});
