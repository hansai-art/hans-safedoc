import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  csvAdapter,
  detectCsvActiveContent,
  detectCsvDialect,
} from '@privacy-bridge/document-formats';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

describe('CSV safe subset', () => {
  it.each([
    [',', 'name,email\n測試,case@example.invalid\n'],
    ['\t', 'name\temail\n測試\tcase@example.invalid\n'],
    [';', 'name;email\n測試;case@example.invalid\n'],
  ] as const)('deterministically detects %s without a model', (delimiter, source) => {
    expect(detectCsvDialect(Buffer.from(source))).toMatchObject({
      status: 'DETECTED',
      dialect: { delimiter, confirmed: true },
      rowCount: 2,
      columnCount: 2,
    });
  });

  it('requires a human choice only when multiple delimiters parse consistently', () => {
    expect(detectCsvDialect(Buffer.from('a,b;c\n1,2;3\n'))).toMatchObject({
      status: 'AMBIGUOUS',
      candidates: expect.arrayContaining([
        expect.objectContaining({ delimiter: ',' }),
        expect.objectContaining({ delimiter: ';' }),
      ]),
    });
  });

  it('requires confirmed dialect and maps quoted newlines/escaped quotes/raw spans', async () => {
    const source = await readFile(new URL('messy-supported.csv', corpus));
    expect(() => csvAdapter.extract(source)).toThrow(/dialect/i);
    const result = csvAdapter.extract(source, {
      delimiter: ',',
      confirmed: true,
      allowInconsistentColumns: true,
    });
    expect(result.rows.some((row) => row.some((field) => field.value.includes('\n')))).toBe(true);
    const matchingFields = result.rows
      .flat()
      .filter((entry) => entry.value === 'case.alpha@example.invalid');
    expect(matchingFields.length).toBeGreaterThan(1);
    const firstArtifact = csvAdapter.rewrite(source, [
      { locator: matchingFields[0]!.locator, replacement: '⟦PB:EMAIL:E1:TAG⟧' },
    ]);
    expect(csvAdapter.residual(firstArtifact, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
    const artifact = csvAdapter.rewrite(
      source,
      matchingFields.map((field) => ({ locator: field.locator, replacement: '⟦PB:EMAIL:E1:TAG⟧' })),
    );
    const reopened = csvAdapter.extract(artifact, {
      delimiter: ',',
      confirmed: true,
      allowInconsistentColumns: true,
    });
    expect(reopened.rows.flat().some((entry) => entry.value === '⟦PB:EMAIL:E1:TAG⟧')).toBe(true);
    expect(csvAdapter.residual(artifact, ['case.alpha@example.invalid'])).toEqual([]);
  });

  it('blocks inconsistent columns by default', async () => {
    const source = await readFile(new URL('messy-supported.csv', corpus));
    expect(() => csvAdapter.extract(source, { delimiter: ',', confirmed: true })).toThrow(
      /column/i,
    );
  });

  it('blocks canonical formula injection variants', () => {
    for (const value of ['=1+1', ' +cmd', '\t@SUM(A1)', '＝WEBSERVICE("x")', '\u200b-cmd']) {
      expect(detectCsvActiveContent(value)).toBe(true);
    }
  });
});
