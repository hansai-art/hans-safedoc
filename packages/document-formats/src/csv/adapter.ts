import { decodeTxt } from '../txt/adapter.js';

/** Prototype locator; Gate 1 keeps it distinct from the locked v1.1 evidence contract. */
export interface PrototypeCsvFieldLocator {
  kind: 'csv-field';
  row: number;
  column: number;
  byteStart: number;
  byteEnd: number;
}

export interface CsvDialect {
  delimiter: ',' | '\t' | ';';
  confirmed: true;
  allowInconsistentColumns?: boolean;
}
export interface CsvField {
  value: string;
  locator: PrototypeCsvFieldLocator;
}
export interface CsvExtraction {
  rows: CsvField[][];
  delimiter: CsvDialect['delimiter'];
}
export interface CsvRewrite {
  locator: CsvField['locator'];
  replacement: string;
}

export interface CsvDialectCandidate {
  readonly delimiter: CsvDialect['delimiter'];
  readonly rowCount: number;
  readonly columnCount: number;
}

export type CsvDialectDetection =
  | ({ readonly status: 'DETECTED'; readonly dialect: CsvDialect } & CsvDialectCandidate)
  | { readonly status: 'AMBIGUOUS'; readonly candidates: readonly CsvDialectCandidate[] };

const invisiblePrefix = new Set(['\u200b', '\u200c', '\u200d', '\u2060']);
export function detectCsvActiveContent(value: string): boolean {
  let canonical = value.normalize('NFKC').trimStart();
  while (canonical[0] && invisiblePrefix.has(canonical[0]))
    canonical = canonical.slice(1).trimStart();
  if (/^-\d+(?:\.\d+)?$/u.test(canonical)) return false;
  return /^[=+\-@]/u.test(canonical);
}
function unquote(raw: string): string {
  return raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1).replace(/""/g, '"') : raw;
}
function quote(value: string, delimiter: string): string {
  return value.includes(delimiter) || /["\r\n]/u.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}
function parseCsvInternal(
  source: Buffer,
  dialect: CsvDialect | undefined,
  checkActiveContent: boolean,
): CsvExtraction {
  if (!dialect?.confirmed) throw new Error('CSV dialect must be user-confirmed');
  const { text, bom } = decodeTxt(source);
  const rows: CsvField[][] = [[]];
  let row = 0,
    column = 0,
    start = 0,
    cursor = 0,
    quoted = false;
  const offset = bom ? 3 : 0;
  const add = (end: number) => {
    const raw = text.slice(start, end);
    rows[row]!.push({
      value: unquote(raw),
      locator: {
        kind: 'csv-field',
        row,
        column,
        byteStart: offset + Buffer.byteLength(text.slice(0, start)),
        byteEnd: offset + Buffer.byteLength(text.slice(0, end)),
      },
    });
    column += 1;
  };
  while (cursor < text.length) {
    const ch = text[cursor]!;
    if (ch === '"') {
      if (quoted && text[cursor + 1] === '"') cursor += 1;
      else quoted = !quoted;
    } else if (!quoted && ch === dialect.delimiter) {
      add(cursor);
      start = cursor + 1;
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      add(cursor);
      if (ch === '\r' && text[cursor + 1] === '\n') cursor += 1;
      row += 1;
      rows.push([]);
      column = 0;
      start = cursor + 1;
    }
    cursor += 1;
  }
  if (start < text.length || text.endsWith(dialect.delimiter)) add(text.length);
  else if (rows.at(-1)?.length === 0) rows.pop();
  if (quoted) throw new Error('Malformed CSV quote');
  const widths = new Set(rows.map((x) => x.length));
  if (widths.size > 1 && !dialect.allowInconsistentColumns)
    throw new Error('Inconsistent CSV column count');
  if (checkActiveContent)
    for (const field of rows.flat())
      if (detectCsvActiveContent(field.value)) throw new Error('CSV active content blocked');
  return { rows, delimiter: dialect.delimiter };
}

export function parseCsv(source: Buffer, dialect?: CsvDialect): CsvExtraction {
  return parseCsvInternal(source, dialect, true);
}

export function detectCsvDialect(source: Buffer): CsvDialectDetection {
  const candidates: CsvDialectCandidate[] = [];
  const parseErrors: string[] = [];
  for (const delimiter of [',', '\t', ';'] as const) {
    try {
      const extraction = parseCsvInternal(
        source,
        { delimiter, confirmed: true, allowInconsistentColumns: true },
        false,
      );
      const widths = new Set(extraction.rows.map((row) => row.length));
      const columnCount = extraction.rows[0]?.length ?? 0;
      if (widths.size === 1 && columnCount > 1)
        candidates.push({ delimiter, rowCount: extraction.rows.length, columnCount });
    } catch (error) {
      parseErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (candidates.length === 1) {
    const candidate = candidates[0]!;
    return {
      status: 'DETECTED',
      dialect: { delimiter: candidate.delimiter, confirmed: true },
      ...candidate,
    };
  }
  if (candidates.length > 1) return { status: 'AMBIGUOUS', candidates };
  if (parseErrors.some((message) => message === 'Malformed CSV quote'))
    throw new Error('Malformed CSV quote');
  const singleColumn = parseCsvInternal(
    source,
    { delimiter: ',', confirmed: true, allowInconsistentColumns: true },
    false,
  );
  if (singleColumn.rows.every((row) => row.length === 1))
    return {
      status: 'DETECTED',
      dialect: { delimiter: ',', confirmed: true },
      delimiter: ',',
      rowCount: singleColumn.rows.length,
      columnCount: 1,
    };
  return { status: 'AMBIGUOUS', candidates: [] };
}
export function rewriteCsv(
  source: Buffer,
  operations: readonly CsvRewrite[],
  delimiter: CsvDialect['delimiter'] = ',',
): Buffer {
  const sorted = [...operations].sort((a, b) => b.locator.byteStart - a.locator.byteStart);
  let out = Buffer.from(source);
  let boundary = source.length + 1;
  for (const op of sorted) {
    const { byteStart, byteEnd } = op.locator;
    if (byteEnd > boundary || byteStart < 0 || byteEnd < byteStart || byteEnd > source.length)
      throw new Error('Invalid or overlapping CSV rewrite span');
    const replacement = Buffer.from(quote(op.replacement, delimiter));
    out = Buffer.concat([out.subarray(0, byteStart), replacement, out.subarray(byteEnd)]);
    boundary = byteStart;
  }
  return out;
}
export const csvAdapter = {
  id: 'hsd-csv-v1.1',
  version: '1.1.0' as const,
  extract: parseCsv,
  rewrite: rewriteCsv,
  reopen: parseCsv,
  residual(artifact: Buffer, needles: readonly string[]) {
    const text = decodeTxt(artifact).text;
    return needles.filter((x) => text.includes(x));
  },
};
