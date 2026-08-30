import { describe, expect, it } from 'vitest';
import {
  assertArtifactLocatorV11,
  assertFormatLocatorV11,
  FORMAT_VERSION,
} from '@privacy-bridge/document-formats';

const hash = 'a'.repeat(64);
const common = { sourceSurfaceHashSha256: hash, mapSha256: hash };

describe('v1.1 contracts', () => {
  it('accepts all 16 exact tagged source locators', () => {
    const locators = [
      {
        kind: 'txt',
        ...common,
        rawByteStart: 0,
        rawByteEnd: 3,
        logicalStartUtf16: 0,
        logicalEndUtf16: 3,
        segmentId: 'body',
      },
      {
        kind: 'csv-field',
        ...common,
        rowIndex0: 1,
        columnIndex0: 2,
        rawFieldByteStart: 4,
        rawFieldByteEnd: 9,
        rawContentByteStart: 5,
        rawContentByteEnd: 8,
        decodedStartUtf16: 0,
        decodedEndUtf16: 3,
        quoteState: 'quoted',
      },
      {
        kind: 'docx-text',
        ...common,
        partName: 'word/document.xml',
        blockPath: '/w:document[0]/w:body[0]/w:p[0]',
        runSlices: [{ childPath: '/w:r[0]/w:t[0]', startUtf16: 0, endUtf16: 2 }],
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'xlsx-cell-text',
        ...common,
        sheetRelId: 'rId1',
        cellRef: 'A1',
        valueKind: 'shared',
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'xlsx-raw-value',
        ...common,
        partName: 'xl/worksheets/sheet1.xml',
        sheetRelId: 'rId1',
        cellRef: 'A1',
        elementQName: 'x:v',
        startUtf16: 0,
        endUtf16: 2,
      },
      {
        kind: 'xlsx-display-value',
        ...common,
        partName: 'xl/worksheets/sheet1.xml',
        sheetRelId: 'rId1',
        cellRef: 'A1',
        rawValueHashSha256: hash,
        numberFormatId: 1,
        displayStartUtf16: 0,
        displayEndUtf16: 2,
      },
      {
        kind: 'xlsx-formula',
        ...common,
        partName: 'xl/worksheets/sheet1.xml',
        sheetRelId: 'rId1',
        cellRef: 'A1',
        formulaKind: 'normal',
        elementQName: 'x:f',
        startUtf16: 0,
        endUtf16: 2,
      },
      {
        kind: 'xlsx-cached-result',
        ...common,
        partName: 'xl/worksheets/sheet1.xml',
        sheetRelId: 'rId1',
        cellRef: 'A1',
        elementQName: 'x:v',
        startUtf16: 0,
        endUtf16: 2,
      },
      {
        kind: 'ooxml-element-text',
        ...common,
        package: 'docx',
        partName: 'word/comments.xml',
        canonicalElementPath: '/w:comments[0]/w:comment[0]',
        elementQName: 'w:t',
        textNodeIndex: 0,
        startUtf16: 0,
        endUtf16: 2,
      },
      {
        kind: 'ooxml-attribute-value',
        ...common,
        package: 'xlsx',
        partName: 'xl/theme/theme1.xml',
        canonicalElementPath: '/a:theme[0]',
        elementQName: 'a:theme',
        attributeQName: 'name',
        startUtf16: 0,
        endUtf16: 2,
      },
      {
        kind: 'ooxml-property',
        ...common,
        package: 'docx',
        partName: 'docProps/core.xml',
        propertyQName: 'dc:creator',
        occurrenceIndex0: 0,
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'comment-author',
        ...common,
        package: 'docx',
        partName: 'word/comments.xml',
        commentId: '1',
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'relationship-target',
        ...common,
        package: 'docx',
        relsPartName: 'word/_rels/document.xml.rels',
        relationshipId: 'rId1',
        targetMode: 'Internal',
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'xlsx-sheet-name',
        ...common,
        sheetIndex0: 0,
        sheetRelId: 'rId1',
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'xlsx-defined-name',
        ...common,
        definedNameIndex0: 0,
        localSheetId: 0,
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
      {
        kind: 'xlsx-table-name',
        ...common,
        partName: 'xl/tables/table1.xml',
        tableId: 1,
        attribute: 'displayName',
        logicalStartUtf16: 0,
        logicalEndUtf16: 2,
      },
    ];
    expect(FORMAT_VERSION).toBe('1.1.0');
    for (const locator of locators) expect(assertFormatLocatorV11(locator)).toEqual(locator);
    expect(new Set(locators.map((locator) => locator.kind)).size).toBe(16);

    const artifact = {
      ...locators[0],
      artifactLogicalStartUtf16: 0,
      artifactLogicalEndUtf16: 3,
      artifactSurfaceSha256: hash,
      sourceToOutputMapSha256: hash,
    };
    expect(assertArtifactLocatorV11(artifact)).toEqual(artifact);
  });

  it('rejects mixed variants, unknown fields and raw paths/values', () => {
    expect(() =>
      assertFormatLocatorV11({
        kind: 'txt',
        ...common,
        rawByteStart: 0,
        rawByteEnd: 1,
        logicalStartUtf16: 0,
        logicalEndUtf16: 1,
        segmentId: 'body',
        rowIndex0: 1,
      }),
    ).toThrow();
    expect(() =>
      assertFormatLocatorV11({
        kind: 'docx-text',
        ...common,
        partName: '/Users/private/source.docx',
        blockPath: '/w:p[0]',
        runSlices: [{ childPath: '/w:r[0]/w:t[0]', startUtf16: 0, endUtf16: 1 }],
        logicalStartUtf16: 0,
        logicalEndUtf16: 1,
      }),
    ).toThrow();
    expect(() =>
      assertFormatLocatorV11({
        kind: 'txt',
        ...common,
        rawByteStart: 0,
        rawByteEnd: 1,
        logicalStartUtf16: 0,
        logicalEndUtf16: 1,
        segmentId: 'body',
        rawValue: 'secret',
      }),
    ).toThrow();
  });
});
