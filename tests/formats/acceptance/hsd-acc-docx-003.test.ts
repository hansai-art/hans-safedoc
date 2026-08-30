import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { docxAdapter, OoxmlBlockedError } from '@privacy-bridge/document-formats';

const fixture = new URL('../../fixtures/formats/docx/hsd-acc-docx-003/input.docx', import.meta.url);

describe('HSD-ACC-DOCX-003 tracked revisions', () => {
  it('fails closed before rewrite and preserves the source bytes', async () => {
    const source = await readFile(fixture);
    const before = createHash('sha256').update(source).digest('hex');
    expect(() => docxAdapter.extract(source)).toThrow(OoxmlBlockedError);
    expect(createHash('sha256').update(source).digest('hex')).toBe(before);
  });
});
