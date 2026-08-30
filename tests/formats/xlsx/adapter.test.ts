import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OoxmlBlockedError, xlsxAdapter } from '@privacy-bridge/document-formats';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

describe('XLSX safe subset', () => {
  it('accepts the frozen LibreOffice common theme but keeps it in mandatory review', async () => {
    const source = await readFile(new URL('common-libreoffice.xlsx', corpus));
    const extraction = xlsxAdapter.extract(source);

    expect(extraction.cells.some((cell) => cell.value === '0900-000-012')).toBe(true);
    expect(extraction.manualReview).toContain('xl/theme/theme1.xml');
  });

  it('fails closed for an unknown element inside an otherwise common theme', async () => {
    const source = await readFile(new URL('blocked-unknown-theme.xlsx', corpus));
    expect(() => xlsxAdapter.extract(source)).toThrow(OoxmlBlockedError);
  });

  it('extracts all visible/hidden/veryHidden inline cells and preserves structure on rewrite', async () => {
    const source = await readFile(new URL('messy-formula-free.xlsx', corpus));
    const before = Buffer.from(source);
    const extraction = xlsxAdapter.extract(source);
    expect(new Set(extraction.cells.map((x) => x.sheetState))).toEqual(
      new Set(['visible', 'hidden', 'veryHidden']),
    );
    const matchingCells = extraction.cells.filter((x) => x.value === 'case.alpha@example.invalid');
    expect(matchingCells.length).toBeGreaterThan(1);
    const firstArtifact = xlsxAdapter.rewrite(source, [
      { locator: matchingCells[0]!.locator, replacement: '⟦PB:EMAIL:E1:TAG⟧' },
    ]);
    expect(xlsxAdapter.residual(firstArtifact, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
    const artifact = xlsxAdapter.rewrite(
      source,
      matchingCells.map((cell) => ({
        locator: cell.locator,
        replacement: '⟦PB:EMAIL:E1:TAG⟧',
      })),
    );
    expect(source).toEqual(before);
    const reopened = xlsxAdapter.reopen(artifact);
    expect(reopened.cells.some((x) => x.value === '⟦PB:EMAIL:E1:TAG⟧')).toBe(true);
    expect(xlsxAdapter.residual(artifact, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
  }, 30_000);

  it.each(['blocked-formulas.xlsx', 'blocked-comments-theme.xlsx'])(
    'fails closed for %s even with zero replacements',
    async (name) => {
      const source = await readFile(new URL(name, corpus));
      expect(() => xlsxAdapter.extract(source)).toThrow(OoxmlBlockedError);
    },
  );
});
