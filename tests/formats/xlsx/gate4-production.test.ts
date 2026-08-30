import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OoxmlBlockedError, xlsxAdapter } from '@privacy-bridge/document-formats';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

describe('Gate 4 XLSX production evidence', () => {
  it('creates hash-bound locators using stable workbook relationship identity', async () => {
    const source = await readFile(new URL('messy-formula-free.xlsx', corpus));
    const extraction = xlsxAdapter.extract(source);
    const phone = extraction.cells.find((cell) => cell.cell === 'B2')!;

    expect(phone.sheetName).toBe('客服紀錄');
    expect(phone.sheetRelId).toBe('rId1');
    expect(phone.locator).toMatchObject({
      sheetRelId: 'rId1',
      cellRef: 'B2',
      sourceSurfaceHashSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      mapSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(new Set(extraction.sheets.map((sheet) => sheet.state))).toEqual(
      new Set(['visible', 'hidden', 'veryHidden']),
    );
  });

  it('inventories raw and display values without treating ordinary numbers as postal codes', async () => {
    const source = await readFile(new URL('messy-formula-free.xlsx', corpus));
    const extraction = xlsxAdapter.extract(source);
    const formattedPhone = extraction.cells.find((cell) => cell.cell === 'B2')!;
    const ordinaryNumber = extraction.cells.find((cell) => cell.cell === 'B4')!;

    expect(formattedPhone.rawValue).toBe('900000001');
    expect(formattedPhone.displayValue).toBe('0900-000-001');
    expect(formattedPhone.numberFormat).toBe('0000-000-000');
    expect(formattedPhone.candidatePolicy).toBe('formatted-identifier');
    expect(ordinaryNumber.candidatePolicy).toBe('ordinary-number');
  });

  it('inventories metadata and external hyperlinks as mandatory review, while preserving merged cells', async () => {
    const source = await readFile(new URL('messy-formula-free.xlsx', corpus));
    const extraction = xlsxAdapter.extract(source);

    expect(extraction.reviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'metadata', value: '王測試', mandatoryReview: true }),
        expect.objectContaining({
          kind: 'hyperlink',
          value: 'mailto:case.alpha@example.invalid',
          mandatoryReview: true,
        }),
      ]),
    );
    expect(extraction.mergedCells).toEqual(
      expect.arrayContaining([expect.objectContaining({ sheetRelId: 'rId1', range: 'A6:B6' })]),
    );
    expect(extraction.definedNames).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '_xlnm._FilterDatabase' })]),
    );
    expect(extraction.reviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'defined-name',
          value: "'客服紀錄'!$A$1:$E$4",
          mandatoryReview: true,
        }),
        expect.objectContaining({
          kind: 'font-name',
          value: 'Calibri',
          mandatoryReview: true,
          locator: expect.objectContaining({ kind: 'ooxml-attribute-value' }),
        }),
      ]),
    );
    expect(xlsxAdapter.residual(source, ["'客服紀錄'!$A$1:$E$4", 'Calibri'])).toEqual([
      "'客服紀錄'!$A$1:$E$4",
      'Calibri',
    ]);
  });

  it('rejects formula and comment workbooks with a values-only remediation and no rewrite path', async () => {
    const formulas = await readFile(new URL('blocked-formulas.xlsx', corpus));
    const comments = await readFile(new URL('blocked-comments-theme.xlsx', corpus));

    for (const source of [formulas, comments]) {
      expect(() => xlsxAdapter.extract(source)).toThrow(OoxmlBlockedError);
      try {
        xlsxAdapter.extract(source);
      } catch (error) {
        expect((error as OoxmlBlockedError).blockers.join('\n')).toMatch(/values-only|comments/u);
      }
    }
  });

  it('returns locator-bound formula and cached-result blocker evidence before rewrite', async () => {
    const source = await readFile(new URL('blocked-formulas.xlsx', corpus));

    try {
      xlsxAdapter.extract(source);
      expect.unreachable('formula workbook must fail closed');
    } catch (error) {
      expect(error).toBeInstanceOf(OoxmlBlockedError);
      const evidence = (error as OoxmlBlockedError).evidence;
      expect(evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'xlsx-formula',
            locator: expect.objectContaining({
              kind: 'xlsx-formula',
              partName: expect.stringMatching(/^xl\/worksheets\//u),
              cellRef: expect.any(String),
              formulaKind: expect.stringMatching(
                /^(?:normal|shared-master|shared-follower|array|data-table)$/u,
              ),
            }),
          }),
          expect.objectContaining({
            code: 'xlsx-cached-result',
            locator: expect.objectContaining({ kind: 'xlsx-cached-result' }),
          }),
        ]),
      );
    }
  });

  it('rejects stale typed locators and verifies disk reopen, residual, canary and graph conservation', async () => {
    const source = await readFile(new URL('messy-formula-free.xlsx', corpus));
    const extraction = xlsxAdapter.extract(source);
    const cell = extraction.cells.find(
      (candidate) => candidate.value === 'case.alpha@example.invalid',
    )!;
    const artifact = xlsxAdapter.rewrite(source, [
      { locator: cell.locator, replacement: '⟦PB:EMAIL:E1:TAG⟧' },
    ]);

    expect(
      xlsxAdapter
        .reopen(artifact)
        .cells.some((candidate) => candidate.value === '⟦PB:EMAIL:E1:TAG⟧'),
    ).toBe(true);
    expect(xlsxAdapter.residual(artifact, ['case.alpha@example.invalid'])).toEqual([
      'case.alpha@example.invalid',
    ]);
    expect(xlsxAdapter.verifyArtifact(source, artifact).unchangedEntries).toContain(
      'docProps/core.xml',
    );
    expect(xlsxAdapter.verifyReopen(artifact)).toMatchObject({
      package: 'xlsx',
      entryCount: extraction.entryCount,
      relationshipGraphSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      packageSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      entryHashes: expect.objectContaining({
        'xl/workbook.xml': expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    });
    expect(() =>
      xlsxAdapter.rewrite(source, [
        { locator: { ...cell.locator, sourceSurfaceHashSha256: '0'.repeat(64) }, replacement: 'x' },
      ]),
    ).toThrow(OoxmlBlockedError);
  });
});
