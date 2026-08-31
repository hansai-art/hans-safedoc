export function assertSafeXml(xml: string): void {
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/iu.test(xml))
    throw new Error('Unsafe XML declaration/entity');
  if (/\b(?:mc:)?AlternateContent\b/u.test(xml)) throw new Error('AlternateContent is unsupported');
}

const DRAWINGML_NAMESPACE = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const OFFICE_RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const commonThemeAttributes: Readonly<Record<string, readonly string[]>> = {
  theme: ['xmlns:a', 'xmlns:r', 'name'],
  themeElements: [],
  clrScheme: ['name'],
  dk1: [],
  lt1: [],
  dk2: [],
  lt2: [],
  accent1: [],
  accent2: [],
  accent3: [],
  accent4: [],
  accent5: [],
  accent6: [],
  hlink: [],
  folHlink: [],
  srgbClr: ['val'],
  fontScheme: ['name'],
  majorFont: [],
  minorFont: [],
  latin: ['typeface', 'pitchFamily', 'charset'],
  ea: ['typeface', 'pitchFamily', 'charset'],
  cs: ['typeface', 'pitchFamily', 'charset'],
  fmtScheme: [],
  fillStyleLst: [],
  solidFill: [],
  schemeClr: ['val'],
  lnStyleLst: [],
  ln: ['w', 'cap', 'cmpd', 'algn'],
  prstDash: ['val'],
  miter: [],
  effectStyleLst: [],
  effectStyle: [],
  effectLst: [],
  bgFillStyleLst: [],
};

/** Gate-0 profile for the frozen LibreOffice common theme corpus. */
export function assertKnownCommonThemeXml(xml: string): void {
  assertSafeXml(xml);
  if (/<!--|<!\[CDATA\[|<\?(?!xml\b)/u.test(xml)) throw new Error('Unsupported theme XML node');
  const withoutDeclaration = xml.replace(/^\s*<\?xml\b[^?]*\?>/u, '');
  const tags = [...withoutDeclaration.matchAll(/<([^>]+)>/gu)];
  const text = withoutDeclaration.replace(/<[^>]+>/gu, '');
  if (text.trim()) throw new Error('Theme text nodes are unsupported');
  const stack: string[] = [];
  let sawRoot = false;
  for (const tag of tags) {
    const body = tag[1]!.trim();
    if (body.startsWith('/')) {
      const name = body.slice(1).trim();
      if (stack.pop() !== name) throw new Error('Theme XML nesting mismatch');
      continue;
    }
    const selfClosing = body.endsWith('/');
    const opening = selfClosing ? body.slice(0, -1).trim() : body;
    const nameMatch = /^([A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*)(?:\s+|$)/u.exec(opening);
    if (!nameMatch) throw new Error('Theme element name is invalid');
    const qualifiedName = nameMatch[1]!;
    const [prefix, localName] = qualifiedName.split(':');
    if (prefix !== 'a' || !localName || !(localName in commonThemeAttributes))
      throw new Error(`Unknown theme element: ${qualifiedName}`);
    const attributesText = opening.slice(nameMatch[0].length);
    const attributes = [...attributesText.matchAll(/([\w:.-]+)\s*=\s*(["'])(.*?)\2/gu)];
    const residue = attributesText.replace(/([\w:.-]+)\s*=\s*(["'])(.*?)\2/gu, '').trim();
    if (residue) throw new Error('Theme attribute syntax is invalid');
    if (new Set(attributes.map((attribute) => attribute[1])).size !== attributes.length)
      throw new Error('Duplicate theme attribute');
    const allowed = new Set(commonThemeAttributes[localName]);
    for (const attribute of attributes) {
      if (!allowed.has(attribute[1]!)) throw new Error(`Unknown theme attribute: ${attribute[1]}`);
    }
    if (!sawRoot) {
      if (qualifiedName !== 'a:theme') throw new Error('Theme root is invalid');
      const values = new Map(attributes.map((attribute) => [attribute[1], attribute[3]]));
      if (
        values.get('xmlns:a') !== DRAWINGML_NAMESPACE ||
        values.get('xmlns:r') !== OFFICE_RELATIONSHIP_NAMESPACE
      )
        throw new Error('Theme namespace is invalid');
      sawRoot = true;
    } else {
      if (stack.length === 0) throw new Error('Theme XML has multiple root elements');
      if (attributes.some((attribute) => attribute[1]!.startsWith('xmlns')))
        throw new Error('Nested theme namespace declaration is unsupported');
    }
    if (!selfClosing) stack.push(qualifiedName);
  }
  if (!sawRoot || stack.length) throw new Error('Theme XML is incomplete');
}
export function escapeXmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
export function xmlElements(
  xml: string,
  localName: string,
): { start: number; end: number; innerStart: number; innerEnd: number; inner: string }[] {
  const out = [];
  const pattern = new RegExp(
    `<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}>`,
    'gu',
  );
  let match;
  while ((match = pattern.exec(xml))) {
    const whole = match[0],
      inner = match[1]!;
    const rel = whole.indexOf('>') + 1;
    out.push({
      start: match.index,
      end: match.index + whole.length,
      innerStart: match.index + rel,
      innerEnd: match.index + rel + inner.length,
      inner,
    });
  }
  return out;
}
