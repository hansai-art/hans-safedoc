import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { txtAdapter } from '@privacy-bridge/document-formats';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

describe('TXT safe subset', () => {
  it('preserves BOM, CRLF, no-final-newline and untouched bytes', async () => {
    const source = await readFile(new URL('messy-supported-utf8.txt', corpus));
    const extracted = txtAdapter.extract(source);
    const needle = '0900-000-001';
    const start = extracted.text.indexOf(needle);
    const artifact = txtAdapter.rewrite(source, [
      { start, end: start + needle.length, replacement: '⟦PB:PHONE:E1:TAG⟧' },
    ]);
    expect(artifact.subarray(0, 3)).toEqual(source.subarray(0, 3));
    expect(artifact.toString()).toContain('\r\n');
    expect(artifact.at(-1)).not.toBe(10);
    expect(txtAdapter.reopen(artifact).text).toContain('⟦PB:PHONE:E1:TAG⟧');
    expect(txtAdapter.residual(artifact, [needle])).toEqual([]);
  });

  it.each(['blocked-big5.txt', 'blocked-nul.txt'])('rejects %s', async (name) => {
    await expect(async () =>
      txtAdapter.extract(await readFile(new URL(name, corpus))),
    ).rejects.toThrow();
  });

  it.each(['text\u0007bell', 'text\u0085control', 'text\u200bhidden', 'text\u202esecret'])(
    'rejects invisible or unsafe control content',
    (text) => expect(() => txtAdapter.extract(Buffer.from(text))).toThrow(/HSD-ENC-10[45]/u),
  );

  it('uses Unicode character offsets without normalization', () => {
    const source = Buffer.from('A😀éZ');
    const out = txtAdapter.rewrite(source, [{ start: 1, end: 3, replacement: 'TOKEN' }]);
    expect(out.toString()).toBe('ATOKENéZ');
  });
});
