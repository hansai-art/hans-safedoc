import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { docxAdapter } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-009/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-009 mandatory identity metadata', () => {
  it('always emits author, company and comment-author review records with typed locators', async () => {
    const extraction = docxAdapter.extract(await readFile(fixture));
    for (const value of ['王測試', '不存在測試科技', '測試審核員']) {
      const record = extraction.reviewItems.find((item) => item.value.includes(value));
      expect(record, value).toMatchObject({
        mandatoryReview: true,
        locator: expect.objectContaining({
          sourceSurfaceHashSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
          mapSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
      });
    }
    expect(docxAdapter.residual(await readFile(fixture), ['王測試', '測試審核員'])).toEqual([
      '王測試',
      '測試審核員',
    ]);
  });
});
