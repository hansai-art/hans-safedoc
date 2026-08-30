import { TextDecoder } from 'node:util';

export interface TxtExtraction {
  text: string;
  bom: boolean;
}
export interface TxtSpanRewrite {
  start: number;
  end: number;
  replacement: string;
}
const decoder = new TextDecoder('utf-8', { fatal: true });

export function decodeTxt(source: Buffer): TxtExtraction {
  if (source.includes(0)) throw new Error('HSD-ENC-102: NUL is not allowed');
  if (
    source.length >= 2 &&
    ((source[0] === 0xff && source[1] === 0xfe) || (source[0] === 0xfe && source[1] === 0xff))
  )
    throw new Error('HSD-ENC-101: UTF-16 is unsupported');
  const bom = source.length >= 3 && source[0] === 0xef && source[1] === 0xbb && source[2] === 0xbf;
  const body = bom ? source.subarray(3) : source;
  let text: string;
  try {
    text = decoder.decode(body);
  } catch {
    throw new Error('HSD-ENC-100: source is not strict UTF-8');
  }
  if (text.includes('\ufeff')) throw new Error('HSD-ENC-103: non-leading BOM is unsupported');
  for (const character of text) {
    const point = character.codePointAt(0)!;
    if (
      point <= 0x08 ||
      point === 0x0b ||
      point === 0x0c ||
      (point >= 0x0e && point <= 0x1f) ||
      (point >= 0x7f && point <= 0x9f)
    )
      throw new Error('HSD-ENC-104: unsafe C0/C1 control is unsupported');
    if (
      (point >= 0x200b && point <= 0x200f) ||
      (point >= 0x202a && point <= 0x202e) ||
      (point >= 0x2060 && point <= 0x206f)
    )
      throw new Error(
        'HSD-ENC-105: bidi or zero-width control requires manual normalization outside Hans SafeDoc',
      );
  }
  return { text, bom };
}

export function rewriteTxt(source: Buffer, operations: readonly TxtSpanRewrite[]): Buffer {
  const { text, bom } = decodeTxt(source);
  const sorted = [...operations].sort((a, b) => b.start - a.start);
  let result = text;
  let previousStart = text.length + 1;
  for (const op of sorted) {
    if (
      !Number.isSafeInteger(op.start) ||
      !Number.isSafeInteger(op.end) ||
      op.start < 0 ||
      op.end < op.start ||
      op.end > result.length ||
      op.end > previousStart
    )
      throw new Error('Invalid or overlapping TXT rewrite span');
    result = result.slice(0, op.start) + op.replacement + result.slice(op.end);
    previousStart = op.start;
  }
  return Buffer.concat([
    bom ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0),
    Buffer.from(result),
  ]);
}

export const txtAdapter = {
  id: 'hsd-txt-v1.1',
  version: '1.1.0' as const,
  extract: decodeTxt,
  rewrite: rewriteTxt,
  reopen: decodeTxt,
  residual(artifact: Buffer, needles: readonly string[]) {
    const text = decodeTxt(artifact).text;
    return needles.filter((x) => text.includes(x));
  },
};
