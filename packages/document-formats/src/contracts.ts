export const FORMAT_VERSION = '1.1.0' as const;
export type FormatKind = 'md' | 'txt' | 'csv' | 'docx' | 'xlsx';

type HashBound = { sourceSurfaceHashSha256: string; mapSha256: string };
type LogicalSpan = { logicalStartUtf16: number; logicalEndUtf16: number };
type XmlSpan = { startUtf16: number; endUtf16: number };
type PackagePath = { partName: string };
type XlsxCellIdentity = { sheetRelId: string; cellRef: string };

export type FormatLocatorV11 = HashBound &
  (
    | ({
        kind: 'txt';
        rawByteStart: number;
        rawByteEnd: number;
        segmentId: string;
      } & LogicalSpan)
    | {
        kind: 'csv-field';
        rowIndex0: number;
        columnIndex0: number;
        rawFieldByteStart: number;
        rawFieldByteEnd: number;
        rawContentByteStart: number;
        rawContentByteEnd: number;
        decodedStartUtf16: number;
        decodedEndUtf16: number;
        quoteState: 'quoted' | 'plain';
      }
    | ({
        kind: 'docx-text';
        partName: string;
        blockPath: string;
        runSlices: { childPath: string; startUtf16: number; endUtf16: number }[];
      } & LogicalSpan)
    | ({
        kind: 'xlsx-cell-text';
        sheetRelId: string;
        cellRef: string;
        valueKind: 'shared' | 'inline';
        richTextSlices?: { run: number; startUtf16: number; endUtf16: number }[];
      } & LogicalSpan)
    | ({ kind: 'xlsx-raw-value'; elementQName: 'x:v' } & PackagePath & XlsxCellIdentity & XmlSpan)
    | ({
        kind: 'xlsx-display-value';
        rawValueHashSha256: string;
        numberFormatId: number;
        displayStartUtf16: number;
        displayEndUtf16: number;
      } & PackagePath &
        XlsxCellIdentity)
    | ({
        kind: 'xlsx-formula';
        formulaKind: 'normal' | 'shared-master' | 'shared-follower' | 'array' | 'data-table';
        elementQName: 'x:f';
      } & PackagePath &
        XlsxCellIdentity &
        XmlSpan)
    | ({ kind: 'xlsx-cached-result'; elementQName: 'x:v' } & PackagePath &
        XlsxCellIdentity &
        XmlSpan)
    | ({
        kind: 'ooxml-element-text';
        package: 'docx' | 'xlsx';
        canonicalElementPath: string;
        elementQName: string;
        textNodeIndex: number;
      } & PackagePath &
        XmlSpan)
    | ({
        kind: 'ooxml-attribute-value';
        package: 'docx' | 'xlsx';
        canonicalElementPath: string;
        elementQName: string;
        attributeQName: string;
      } & PackagePath &
        XmlSpan)
    | ({
        kind: 'ooxml-property';
        package: 'docx' | 'xlsx';
        propertyQName: string;
        occurrenceIndex0: number;
      } & PackagePath &
        LogicalSpan)
    | ({
        kind: 'comment-author';
        package: 'docx';
        commentId: string;
      } & PackagePath &
        LogicalSpan)
    | ({
        kind: 'relationship-target';
        package: 'docx' | 'xlsx';
        relsPartName: string;
        relationshipId: string;
        targetMode: 'Internal' | 'External';
      } & LogicalSpan)
    | ({ kind: 'xlsx-sheet-name'; sheetIndex0: number; sheetRelId: string } & LogicalSpan)
    | ({
        kind: 'xlsx-defined-name';
        definedNameIndex0: number;
        localSheetId?: number;
      } & LogicalSpan)
    | ({
        kind: 'xlsx-table-name';
        partName: string;
        tableId: number;
        attribute: 'name' | 'displayName';
      } & LogicalSpan)
  );

export type ArtifactLocatorV11 = FormatLocatorV11 & {
  artifactLogicalStartUtf16: number;
  artifactLogicalEndUtf16: number;
  artifactSurfaceSha256: string;
  sourceToOutputMapSha256: string;
};

const commonKeys = ['kind', 'sourceSurfaceHashSha256', 'mapSha256'] as const;
const locatorKeys = {
  txt: ['rawByteStart', 'rawByteEnd', 'logicalStartUtf16', 'logicalEndUtf16', 'segmentId'],
  'csv-field': [
    'rowIndex0',
    'columnIndex0',
    'rawFieldByteStart',
    'rawFieldByteEnd',
    'rawContentByteStart',
    'rawContentByteEnd',
    'decodedStartUtf16',
    'decodedEndUtf16',
    'quoteState',
  ],
  'docx-text': ['partName', 'blockPath', 'runSlices', 'logicalStartUtf16', 'logicalEndUtf16'],
  'xlsx-cell-text': ['sheetRelId', 'cellRef', 'valueKind', 'logicalStartUtf16', 'logicalEndUtf16'],
  'xlsx-raw-value': ['partName', 'sheetRelId', 'cellRef', 'elementQName', 'startUtf16', 'endUtf16'],
  'xlsx-display-value': [
    'partName',
    'sheetRelId',
    'cellRef',
    'rawValueHashSha256',
    'numberFormatId',
    'displayStartUtf16',
    'displayEndUtf16',
  ],
  'xlsx-formula': [
    'partName',
    'sheetRelId',
    'cellRef',
    'formulaKind',
    'elementQName',
    'startUtf16',
    'endUtf16',
  ],
  'xlsx-cached-result': [
    'partName',
    'sheetRelId',
    'cellRef',
    'elementQName',
    'startUtf16',
    'endUtf16',
  ],
  'ooxml-element-text': [
    'package',
    'partName',
    'canonicalElementPath',
    'elementQName',
    'textNodeIndex',
    'startUtf16',
    'endUtf16',
  ],
  'ooxml-attribute-value': [
    'package',
    'partName',
    'canonicalElementPath',
    'elementQName',
    'attributeQName',
    'startUtf16',
    'endUtf16',
  ],
  'ooxml-property': [
    'package',
    'partName',
    'propertyQName',
    'occurrenceIndex0',
    'logicalStartUtf16',
    'logicalEndUtf16',
  ],
  'comment-author': ['package', 'partName', 'commentId', 'logicalStartUtf16', 'logicalEndUtf16'],
  'relationship-target': [
    'package',
    'relsPartName',
    'relationshipId',
    'targetMode',
    'logicalStartUtf16',
    'logicalEndUtf16',
  ],
  'xlsx-sheet-name': ['sheetIndex0', 'sheetRelId', 'logicalStartUtf16', 'logicalEndUtf16'],
  'xlsx-defined-name': ['definedNameIndex0', 'logicalStartUtf16', 'logicalEndUtf16'],
  'xlsx-table-name': ['partName', 'tableId', 'attribute', 'logicalStartUtf16', 'logicalEndUtf16'],
} as const;

type LocatorKind = keyof typeof locatorKeys;
const optionalKeys: Partial<Record<LocatorKind, readonly string[]>> = {
  'xlsx-cell-text': ['richTextSlices'],
  'xlsx-defined-name': ['localSheetId'],
};
const artifactKeys = [
  'artifactLogicalStartUtf16',
  'artifactLogicalEndUtf16',
  'artifactSurfaceSha256',
  'sourceToOutputMapSha256',
] as const;
const integerKeys = new Set([
  'rawByteStart',
  'rawByteEnd',
  'logicalStartUtf16',
  'logicalEndUtf16',
  'rowIndex0',
  'columnIndex0',
  'rawFieldByteStart',
  'rawFieldByteEnd',
  'rawContentByteStart',
  'rawContentByteEnd',
  'decodedStartUtf16',
  'decodedEndUtf16',
  'startUtf16',
  'endUtf16',
  'numberFormatId',
  'displayStartUtf16',
  'displayEndUtf16',
  'textNodeIndex',
  'occurrenceIndex0',
  'sheetIndex0',
  'definedNameIndex0',
  'localSheetId',
  'tableId',
  'artifactLogicalStartUtf16',
  'artifactLogicalEndUtf16',
]);
const hashKeys = new Set([
  'sourceSurfaceHashSha256',
  'mapSha256',
  'rawValueHashSha256',
  'artifactSurfaceSha256',
  'sourceToOutputMapSha256',
]);

function safePart(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').includes('..') &&
    !/^[A-Za-z]:/u.test(value)
  );
}

function exactObject(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === fields.length && keys.every((key) => fields.includes(key));
}

function assertSliceArray(value: unknown, richText: boolean): void {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100_000)
    throw new TypeError('Invalid locator slices');
  const fields = richText
    ? ['run', 'startUtf16', 'endUtf16']
    : ['childPath', 'startUtf16', 'endUtf16'];
  for (const slice of value) {
    if (!exactObject(slice, fields)) throw new TypeError('Invalid locator slice fields');
    if (
      !Number.isSafeInteger(slice.startUtf16) ||
      !Number.isSafeInteger(slice.endUtf16) ||
      (slice.startUtf16 as number) < 0 ||
      (slice.endUtf16 as number) < (slice.startUtf16 as number)
    )
      throw new TypeError('Invalid locator slice span');
    if (richText && (!Number.isSafeInteger(slice.run) || (slice.run as number) < 0))
      throw new TypeError('Invalid rich text run');
    if (
      !richText &&
      (typeof slice.childPath !== 'string' ||
        slice.childPath.length < 1 ||
        slice.childPath.length > 200)
    )
      throw new TypeError('Invalid child path');
  }
}

function assertLocator(value: unknown, artifact: boolean): FormatLocatorV11 | ArtifactLocatorV11 {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Invalid v1.1 locator');
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  if (typeof kind !== 'string' || !(kind in locatorKeys))
    throw new TypeError('Unknown v1.1 locator kind');
  const locatorKind = kind as LocatorKind;
  const required = [...commonKeys, ...locatorKeys[locatorKind], ...(artifact ? artifactKeys : [])];
  const allowed = [...required, ...(optionalKeys[locatorKind] ?? [])];
  if (
    Object.keys(record).some((key) => !allowed.includes(key)) ||
    required.some((key) => !(key in record))
  )
    throw new TypeError('Mixed, missing, or unknown locator field');
  for (const key of allowed) {
    const entry = record[key];
    if (entry === undefined && (optionalKeys[locatorKind] ?? []).includes(key)) continue;
    if (integerKeys.has(key) && (!Number.isSafeInteger(entry) || (entry as number) < 0))
      throw new TypeError(`Invalid ${key}`);
    if (hashKeys.has(key) && (typeof entry !== 'string' || !/^[0-9a-f]{64}$/u.test(entry)))
      throw new TypeError(`Invalid ${key}`);
  }
  for (const key of ['partName', 'relsPartName'])
    if (key in record && !safePart(record[key])) throw new TypeError(`Invalid ${key}`);
  for (const key of [
    'segmentId',
    'blockPath',
    'sheetRelId',
    'canonicalElementPath',
    'elementQName',
    'attributeQName',
    'propertyQName',
    'commentId',
    'relationshipId',
  ])
    if (
      key in record &&
      (typeof record[key] !== 'string' || record[key]!.length < 1 || record[key]!.length > 200)
    )
      throw new TypeError(`Invalid ${key}`);
  if (
    'cellRef' in record &&
    (typeof record.cellRef !== 'string' || !/^[A-Z]{1,3}[1-9][0-9]*$/u.test(record.cellRef))
  )
    throw new TypeError('Invalid cellRef');
  if ('package' in record && !['docx', 'xlsx'].includes(record.package as string))
    throw new TypeError('Invalid package');
  if (locatorKind === 'comment-author' && record.package !== 'docx')
    throw new TypeError('Comment author must belong to DOCX');
  const enums: Record<string, readonly string[]> = {
    quoteState: ['quoted', 'plain'],
    valueKind: ['shared', 'inline'],
    formulaKind: ['normal', 'shared-master', 'shared-follower', 'array', 'data-table'],
    targetMode: ['Internal', 'External'],
    attribute: ['name', 'displayName'],
  };
  for (const [key, values] of Object.entries(enums))
    if (key in record && !values.includes(record[key] as string))
      throw new TypeError(`Invalid ${key}`);
  if (
    ((locatorKind === 'xlsx-raw-value' || locatorKind === 'xlsx-cached-result') &&
      record.elementQName !== 'x:v') ||
    (locatorKind === 'xlsx-formula' && record.elementQName !== 'x:f')
  )
    throw new TypeError('Invalid fixed element QName');
  if ('runSlices' in record) assertSliceArray(record.runSlices, false);
  if ('richTextSlices' in record) assertSliceArray(record.richTextSlices, true);
  for (const [start, end] of [
    ['rawByteStart', 'rawByteEnd'],
    ['rawFieldByteStart', 'rawFieldByteEnd'],
    ['rawContentByteStart', 'rawContentByteEnd'],
    ['decodedStartUtf16', 'decodedEndUtf16'],
    ['logicalStartUtf16', 'logicalEndUtf16'],
    ['startUtf16', 'endUtf16'],
    ['displayStartUtf16', 'displayEndUtf16'],
    ['artifactLogicalStartUtf16', 'artifactLogicalEndUtf16'],
  ] as const)
    if (start in record && (record[end] as number) < (record[start] as number))
      throw new TypeError(`Invalid ${start}/${end} span`);
  return value as FormatLocatorV11 | ArtifactLocatorV11;
}

export function assertFormatLocatorV11(value: unknown): FormatLocatorV11 {
  return assertLocator(value, false) as FormatLocatorV11;
}

export function assertArtifactLocatorV11(value: unknown): ArtifactLocatorV11 {
  return assertLocator(value, true) as ArtifactLocatorV11;
}

/** Temporary shape used only by adapters that have not completed Gate 3/4 migration. */
export type PrototypeRewriteLocator = { kind: string };

export interface RewriteOperation<L extends PrototypeRewriteLocator = PrototypeRewriteLocator> {
  locator: L;
  replacement: string;
}

export interface FormatAdapter<E> {
  readonly id: string;
  readonly version: typeof FORMAT_VERSION;
  extract(source: Buffer, options?: unknown): E;
  rewrite(source: Buffer, operations: readonly RewriteOperation[]): Buffer;
  reopen(artifact: Buffer): E;
  residual(artifact: Buffer, needles: readonly string[]): string[];
}
