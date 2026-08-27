import { createHash } from 'node:crypto';
import { ok, type Result } from './index.js';

export type CandidateType =
  | 'TW_ID'
  | 'TW_ARC'
  | 'TW_TAX_ID'
  | 'TW_PASSPORT'
  | 'PASSPORT_CANDIDATE'
  | 'TW_NHI_CARD'
  | 'TW_MOBILE'
  | 'TW_LANDLINE'
  | 'TW_PHONE_SERVICE'
  | 'TW_ADDRESS'
  | 'TW_POSTCODE'
  | 'TW_PLATE'
  | 'TW_INVOICE'
  | 'TW_BANK_ACCOUNT'
  | 'PERSON'
  | 'ORGANIZATION'
  | 'PROJECT'
  | 'PRODUCT'
  | 'DEPARTMENT'
  | 'SYSTEM'
  | 'CUSTOM_TERM'
  | 'CREDIT_CARD'
  | 'EMAIL'
  | 'IPV4'
  | 'URL'
  | 'LINE_ID'
  | 'SECRET'
  | 'AMBIGUOUS_IDENTIFIER';
export type Handling = 'TOKENIZE' | 'BLOCK_EXPORT';
export interface DetectionEvidence {
  readonly source: 'SAME_LABEL_VALUE' | 'SAME_YAML_PROPERTY' | 'TABLE_HEADER' | 'SAME_LINE';
  readonly hint: string;
}
export interface DetectedCandidate {
  readonly candidateId: string;
  readonly primaryType: CandidateType;
  readonly alternativeTypes: readonly CandidateType[];
  readonly surfaceText: string;
  readonly start: number;
  readonly end: number;
  readonly ruleScore: number;
  readonly handling: Handling;
  readonly matchedRules: readonly string[];
  readonly evidence: readonly DetectionEvidence[];
  readonly sourceTextHash: string;
}
type Raw = {
  -readonly [K in keyof Omit<DetectedCandidate, 'candidateId' | 'alternativeTypes'>]: Omit<
    DetectedCandidate,
    'candidateId' | 'alternativeTypes'
  >[K];
};
const letter: Record<string, number> = {
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
  G: 16,
  H: 17,
  I: 34,
  J: 18,
  K: 19,
  L: 20,
  M: 21,
  N: 22,
  O: 35,
  P: 23,
  Q: 24,
  R: 25,
  S: 26,
  T: 27,
  U: 28,
  V: 29,
  W: 32,
  X: 30,
  Y: 31,
  Z: 33,
};
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const normalized = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');
export function isValidTwId(value: string): boolean {
  const v = normalized(value);
  if (!/^[A-Z][1289]\d{8}$/.test(v)) return false;
  const n = letter[v[0]!];
  if (n === undefined) return false;
  let sum = Math.floor(n / 10) + (n % 10) * 9;
  for (let i = 0; i < 8; i += 1) sum += Number(v[i + 1]!) * (8 - i);
  return (sum + Number(v[9]!)) % 10 === 0;
}
export const isNewArc = (value: string) => isValidTwId(value) && /[89]/.test(normalized(value)[1]!);
export function isValidLegacyArc(value: string): boolean {
  const v = normalized(value);
  if (!/^[A-Z]{2}\d{8}$/.test(v)) return false;
  const a = letter[v[0]!],
    b = letter[v[1]!];
  if (a === undefined || b === undefined) return false;
  let sum = Math.floor(a / 10) + (a % 10) * 9 + (b % 10) * 8;
  for (let i = 0; i < 7; i += 1) sum += Number(v[i + 2]!) * (7 - i);
  return (sum + Number(v[9]!)) % 10 === 0;
}
export function isValidTwTaxId(value: string): boolean {
  const v = value.replace(/[\s-]/g, '');
  if (!/^\d{8}$/.test(v) || /^0{8}$/.test(v)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  const sum = [...v].reduce((n, d, i) => {
    const p = Number(d) * weights[i]!;
    return n + Math.floor(p / 10) + (p % 10);
  }, 0);
  return v[6] === '7' ? sum % 5 === 0 || (sum + 1) % 5 === 0 : sum % 5 === 0;
}
export function isValidLuhn(value: string): boolean {
  const v = value.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(v) || /^(\d)\1+$/.test(v)) return false;
  let sum = 0;
  for (let i = v.length - 1, twice = false; i >= 0; i -= 1, twice = !twice) {
    let n = Number(v[i]);
    if (twice) n = n > 4 ? n * 2 - 9 : n * 2;
    sum += n;
  }
  return sum % 10 === 0;
}
export function isValidTwLandline(value: string): boolean {
  const v = value
    .replace(/\s*(?:#|轉|分機|ext\.?)\s*\d{1,5}\s*$/iu, '')
    .replace(/[\s()+-]/g, '')
    .replace(/^886/, '0');
  if (/^0(?:800|809|900|910|911)\d{6,7}$/.test(v)) return false;
  const rules: readonly [string, readonly number[]][] = [
    ['0826', [5]],
    ['0836', [5]],
    ['037', [6]],
    ['049', [7]],
    ['082', [6]],
    ['089', [6]],
    ['02', [7, 8]],
    ['03', [7]],
    ['04', [7, 8]],
    ['05', [7]],
    ['06', [7]],
    ['07', [7]],
    ['08', [7]],
  ];
  return rules.some(
    ([prefix, lengths]) => v.startsWith(prefix) && lengths.includes(v.length - prefix.length),
  );
}
const city =
  '(?:臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)';
const address = new RegExp(
  `${city}(?:[\u3400-\u9fff]{1,8}(?:鄉|鎮|市|區))?(?:[\u3400-\u9fff]{1,10}(?:村|里))?(?:[\u3400-\u9fff0-9一二三四五六七八九十]{1,14}(?:路|街|大道|道))(?:[一二三四五六七八九十0-9]{1,4}段)?(?:[0-9]{1,4}巷)?(?:[0-9]{1,4}弄)?[0-9]{1,4}(?:(?:之|-)[0-9]{1,4})?號(?:之[0-9]{1,4})?(?:(?:地下)?[0-9]{1,3}樓(?:之[0-9]{1,3})?|[Bb][0-9]{1,2}|[0-9]{1,3}[Ff])?`,
  'gu',
);
function context(
  source: string,
  start: number,
  end: number,
  hints: readonly string[],
): DetectionEvidence[] {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = source.indexOf('\n', end) < 0 ? source.length : source.indexOf('\n', end);
  const line = source.slice(lineStart, lineEnd);
  const lower = line.toLowerCase();
  const hint = hints.find((value) => lower.includes(value.toLowerCase()));
  if (!hint) return [];
  const left = source.slice(lineStart, start);
  return [{ source: /[:：=]/u.test(left) ? 'SAME_LABEL_VALUE' : 'SAME_LINE', hint }];
}
function raw(
  source: string,
  start: number,
  end: number,
  primaryType: CandidateType,
  rule: string,
  score: number,
  handling: Handling = 'TOKENIZE',
  evidence: readonly DetectionEvidence[] = [],
): Raw {
  const surfaceText = source.slice(start, end);
  return {
    primaryType,
    surfaceText,
    start,
    end,
    ruleScore: score,
    handling,
    matchedRules: [rule],
    evidence,
    sourceTextHash: hash(surfaceText),
  };
}
function addRegex(
  found: Raw[],
  source: string,
  regex: RegExp,
  type: CandidateType,
  rule: string,
  score: number,
  options: {
    capture?: number;
    validate?: (v: string) => boolean;
    block?: boolean;
    hints?: readonly string[];
    tieredPassport?: boolean;
  } = {},
): void {
  for (const m of source.matchAll(regex)) {
    const value = options.capture === undefined ? m[0] : m[options.capture];
    if (!value || m.index === undefined) continue;
    const start = m.index + m[0].indexOf(value);
    const end = start + value.length;
    if (options.validate && !options.validate(value)) continue;
    const evidence = context(source, start, end, options.hints ?? []);
    let primaryType = type,
      finalScore = score;
    if (options.tieredPassport && !/^(?:3\d{8}|[DFG]\d{8})$/iu.test(value)) {
      if (!evidence.length) continue;
      primaryType = 'PASSPORT_CANDIDATE';
      finalScore = 0.7;
    }
    found.push(
      raw(
        source,
        start,
        end,
        primaryType,
        rule,
        finalScore + (evidence.length ? 0.1 : 0),
        options.block ? 'BLOCK_EXPORT' : 'TOKENIZE',
        evidence,
      ),
    );
  }
}
export function detectAll(source: string): Result<readonly DetectedCandidate[]> {
  const found: Raw[] = [];
  addRegex(
    found,
    source,
    /(?:password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key|密碼|金鑰|權杖)\s*[:：=]\s*["']?([^\s"'\n,;]{6,})["']?/giu,
    'SECRET',
    'secret-assignment',
    0.85,
    { capture: 1, block: true },
  );
  addRegex(
    found,
    source,
    /-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY BLOCK-----/gu,
    'SECRET',
    'secret-private-key',
    0.99,
    { block: true },
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9._-])eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/gu,
    'SECRET',
    'secret-jwt',
    0.95,
    { block: true },
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9_-])(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:AKIA|ASIA)[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[A-Za-z0-9_-]{35})/gu,
    'SECRET',
    'secret-known-prefix',
    0.97,
    { block: true },
  );
  addRegex(
    found,
    source,
    /(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:([^\s@/]+)@[^\s/]+\/[^\s]+/giu,
    'SECRET',
    'secret-connection-string',
    0.95,
    { capture: 1, block: true },
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9])[A-Za-z][1289]\d{8}(?![A-Za-z0-9])/gu,
    'TW_ID',
    'tw-id-checksum',
    0.97,
    { validate: isValidTwId, hints: ['身分證', '身份證', 'id', '證號'] },
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9])[A-Za-z][89]\d{8}(?![A-Za-z0-9])/gu,
    'TW_ARC',
    'tw-arc-new-checksum',
    0.95,
    { validate: isNewArc, hints: ['居留證', 'arc', '統一證號'] },
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9])[A-Za-z]{2}\d{8}(?![A-Za-z0-9])/gu,
    'TW_ARC',
    'tw-arc-legacy-checksum',
    0.9,
    { validate: isValidLegacyArc, hints: ['居留證', 'arc'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9])(?:[0-9][ -]?){12,18}[0-9](?![0-9])/gu,
    'CREDIT_CARD',
    'credit-card-luhn',
    0.95,
    { validate: isValidLuhn, block: true, hints: ['信用卡', '卡號'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9A-Za-z])\d{8}(?![0-9A-Za-z])/gu,
    'TW_TAX_ID',
    'tw-tax-id-checksum',
    0.75,
    { validate: isValidTwTaxId, hints: ['統編', 'ubn', 'vat'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9])(?:\+886[ -]?|0)9[0-8]\d[ -]?\d{3}[ -]?\d{3}(?![0-9])/gu,
    'TW_MOBILE',
    'tw-mobile',
    0.9,
    { hints: ['手機', '電話', 'tel'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9])(?:\+886[ -]?|0)99[ -]?\d{3}[ -]?\d{3,4}(?![0-9])/gu,
    'TW_PHONE_SERVICE',
    'tw-phone-service',
    0.9,
    { hints: ['電話', 'tel'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9])(?:0800|0809)[ -]?\d{3}[ -]?\d{3,4}(?![0-9])/gu,
    'TW_PHONE_SERVICE',
    'tw-phone-service',
    0.9,
  );
  addRegex(
    found,
    source,
    /(?<![0-9])(?:\+886[ -]?)?(?:\((?:0826|0836|037|049|082|089|02|03|04|05|06|07|08)\)|(?:0826|0836|037|049|082|089|02|03|04|05|06|07|08))[ -]?\d(?:[ -]?\d){4,7}(?![0-9])/gu,
    'TW_LANDLINE',
    'tw-landline',
    0.8,
    { validate: isValidTwLandline, hints: ['電話', '市話', 'tel'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9A-Za-z])(?:\d{9}|[A-Za-z]\d{8})(?![0-9A-Za-z])/gu,
    'TW_PASSPORT',
    'tw-passport',
    0.85,
    { tieredPassport: true, hints: ['護照', 'passport'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9A-Za-z])\d{12}(?![0-9A-Za-z])/gu,
    'TW_NHI_CARD',
    'tw-nhi-card',
    0.8,
    { hints: ['健保', '就醫'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9A-Za-z])(?:[A-Z]{3}-\d{4}|[A-Z]{2}-\d{4}|\d{4}-[A-Z]{2}|\d{3}-[A-Z]{2}|[A-Z]{3}-\d{3})(?![0-9A-Za-z])/giu,
    'TW_PLATE',
    'tw-plate',
    0.55,
    { hints: ['車牌', '車號'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9A-Za-z])[A-Z]{2}[ -]?\d{8}(?![0-9A-Za-z])/giu,
    'TW_INVOICE',
    'tw-invoice',
    0.6,
    { hints: ['發票', 'invoice'] },
  );
  addRegex(
    found,
    source,
    /(?<![0-9])(?:[0-9][ -]?){9,16}[0-9](?![0-9])/gu,
    'TW_BANK_ACCOUNT',
    'tw-bank-account',
    0.55,
    { hints: ['帳號', '匯款', '銀行'], validate: (value) => !value.includes(' ') },
  );
  addRegex(found, source, address, 'TW_ADDRESS', 'tw-address', 0.88);
  addRegex(
    found,
    source,
    new RegExp(`(?<![0-9])\\d{3}(?:\\d{2,3})?(?=\\s*${city})`, 'gu'),
    'TW_POSTCODE',
    'tw-postcode-before-city',
    0.85,
  );
  addRegex(
    found,
    source,
    /(?<![0-9])\d{3}(?:\d{2,3})?(?![0-9])/gu,
    'TW_POSTCODE',
    'tw-postcode',
    0.35,
    { hints: ['郵遞區號', '郵編', 'postal', 'zip'] },
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z])/gu,
    'EMAIL',
    'email',
    0.97,
  );
  addRegex(
    found,
    source,
    /(?<![0-9.])(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?![0-9.])/gu,
    'IPV4',
    'ipv4',
    0.9,
  );
  addRegex(
    found,
    source,
    /(?<![A-Za-z0-9])(?:https?|ftp):\/\/[^\s<>"'`，。！？；：、）】》]+/giu,
    'URL',
    'url',
    0.88,
  );
  addRegex(
    found,
    source,
    /LINE\s*(?:ID)?\s*[:：]\s*(@?[A-Za-z0-9._-]{3,20})/giu,
    'LINE_ID',
    'line-id',
    0.85,
    { capture: 1 },
  );
  // A two-letter/eight-digit value can be an old ARC or an invoice number.
  // Do not silently pick the invoice rule when the ARC checksum cannot decide it.
  addRegex(
    found,
    source,
    /(?<![0-9A-Za-z])[A-Z]{2}\d{8}(?![0-9A-Za-z])/giu,
    'AMBIGUOUS_IDENTIFIER',
    'arc-invoice-ambiguous',
    0.91,
    { block: true },
  );
  const grouped: Raw[] = [];
  for (const item of found.sort(
    (a, b) => a.start - b.start || b.end - a.end || b.ruleScore - a.ruleScore,
  )) {
    const same = grouped.find((kept) => item.start < kept.end && kept.start < item.end);
    if (!same) {
      grouped.push(item);
      continue;
    }
    const precise = new Set<CandidateType>(['TW_ID', 'TW_ARC', 'TW_TAX_ID', 'CREDIT_CARD']);
    const winner =
      item.primaryType === 'SECRET' && !precise.has(same.primaryType)
        ? item
        : same.primaryType === 'SECRET' && !precise.has(item.primaryType)
          ? same
          : same.end - same.start > item.end - item.start ||
              (same.end - same.start === item.end - item.start && same.ruleScore >= item.ruleScore)
            ? same
            : item;
    const loser = winner === same ? item : same;
    winner.handling =
      winner.handling === 'BLOCK_EXPORT' || loser.handling === 'BLOCK_EXPORT'
        ? 'BLOCK_EXPORT'
        : 'TOKENIZE';
    winner.matchedRules = [...new Set([...winner.matchedRules, ...loser.matchedRules])];
    winner.evidence = [...winner.evidence, ...loser.evidence];
    if (winner !== same) grouped[grouped.indexOf(same)] = winner;
  }
  return ok(
    grouped
      .sort((a, b) => a.start - b.start || b.end - a.end)
      .map((item) => ({
        ...item,
        candidateId: hash(
          `${item.start}|${item.end}|${item.primaryType}|${item.matchedRules.join(',')}`,
        ).slice(0, 32),
        alternativeTypes:
          item.primaryType === 'AMBIGUOUS_IDENTIFIER' ? ['TW_ARC', 'TW_INVOICE'] : [],
      })),
  );
}
