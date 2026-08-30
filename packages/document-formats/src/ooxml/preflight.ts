import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import {
  OOXML_CONTRACTS,
  type OfficeKind,
  type RelationshipContract,
  type SurfaceContract,
} from './contracts.js';
import { OoxmlBlockedError, readZip, type ZipEntry } from './zip-guard.js';

export type { OfficeKind } from './contracts.js';

const CONTENT_TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const MAX_XML_DEPTH = 64;
const MAX_XML_ATTRIBUTES = 128;
const MAX_XML_NODES = 2_000_000;
const MAX_XML_TEXT = 1024 * 1024;
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const CP = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties';
const EP = 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties';
const DC = 'http://purl.org/dc/elements/1.1/';
const DCTERMS = 'http://purl.org/dc/terms/';
const XSI = 'http://www.w3.org/2001/XMLSchema-instance';

/* Frozen, compiled LibreOffice structural profile. Sensitive surfaces remain in
 * the CSV and are never inferred from these PRESERVE_VALIDATED-only entries. */
const structuralElements: Readonly<Record<string, readonly string[]>> = {
  [`word/comments.xml|${W}`]: ['t'],
  [`word/footnotes.xml|${W}`]: ['t'],
  [`word/header1.xml|${W}`]: ['t'],
  [`word/footer1.xml|${W}`]: ['t'],
  [`docProps/core.xml|${CP}`]: ['coreProperties', 'lastModifiedBy', 'revision'],
  [`docProps/core.xml|${DC}`]: ['creator', 'description', 'language', 'subject', 'title'],
  [`docProps/core.xml|${DCTERMS}`]: ['created', 'modified'],
  [`docProps/app.xml|${EP}`]: ['AppVersion', 'Application', 'Properties', 'Template', 'TotalTime'],
  [`docProps/custom.xml|http://schemas.openxmlformats.org/officeDocument/2006/custom-properties`]: [
    'Properties',
  ],
  [`word/document.xml|${W}`]:
    'bidi body bottom commentRangeStart commentRangeEnd commentReference docGrid document end footnoteReference formProt gridCol jc p pPr pStyle pgMar pgNumType pgSz r rPr sectPr spacing start suppressLineNumbers t tbl tblCellMar tblGrid tblInd tblLayout tblPr tblW tc tcBorders tcPr tcW textDirection top tr trPr type vAlign'.split(
      ' ',
    ),
  [`word/styles.xml|${W}`]:
    'b bCs basedOn bidi bottom color docDefaults i iCs jc keepNext lang name next pBdr pPr pPrDefault qFormat rFonts rPr rPrDefault spacing style styles suppressAutoHyphens suppressLineNumbers sz szCs u vertAlign widowControl'.split(
      ' ',
    ),
  [`word/fontTable.xml|${W}`]: 'altName charset family font fonts pitch'.split(' '),
  [`word/settings.xml|${W}`]:
    'adjustLineHeightInTable autoHyphenation compat compatSetting defaultTabStop hyphenationZone settings view zoom'.split(
      ' ',
    ),
  [`word/theme/theme1.xml|${A}`]:
    'accent1 accent2 accent3 accent4 accent5 accent6 bgFillStyleLst clrScheme cs dk1 dk2 ea effectLst effectStyle effectStyleLst fillStyleLst fmtScheme folHlink fontScheme hlink latin ln lnStyleLst lt1 lt2 majorFont minorFont miter prstDash schemeClr solidFill srgbClr theme themeElements'.split(
      ' ',
    ),
  [`xl/workbook.xml|${X}`]:
    'bookViews calcPr definedName definedNames ext extLst fileVersion sheet sheets workbook workbookPr workbookProtection workbookView'.split(
      ' ',
    ),
  'xl/workbook.xml|http://schemas.libreoffice.org/': ['extCalcPr'],
  [`xl/theme/theme1.xml|${A}`]:
    'accent1 accent2 accent3 accent4 accent5 accent6 bgFillStyleLst clrScheme cs dk1 dk2 ea effectLst effectStyle effectStyleLst fillStyleLst fmtScheme folHlink fontScheme hlink latin ln lnStyleLst lt1 lt2 majorFont minorFont miter prstDash schemeClr solidFill srgbClr theme themeElements'.split(
      ' ',
    ),
  [`xl/sharedStrings.xml|${X}`]: ['si', 'sst', 't'],
  [`xl/styles.xml|${X}`]:
    'alignment border borders bottom cellStyle cellStyleXfs cellStyles cellXfs colors diagonal family fill fills font fonts indexedColors left name numFmt numFmts patternFill protection rgbColor right styleSheet sz top xf'.split(
      ' ',
    ),
  [`xl/worksheets/sheetN.xml|${X}`]:
    'autoFilter c col cols dimension headerFooter hyperlink hyperlinks is mergeCell mergeCells oddFooter oddHeader outlinePr pageMargins pageSetUpPr pageSetup pane printOptions row selection sheetData sheetFormatPr sheetPr sheetView sheetViews t v worksheet'.split(
      ' ',
    ),
};
const structuralAttributes: Readonly<Record<string, readonly string[]>> = {
  [`word/document.xml|http://schemas.openxmlformats.org/officeDocument/2006/relationships`]: ['id'],
  [`word/footnotes.xml|${W}`]: ['id'],
  [`docProps/core.xml|${XSI}`]: ['type'],
  'word/document.xml|http://schemas.openxmlformats.org/markup-compatibility/2006': ['Ignorable'],
  [`word/document.xml|${W}`]:
    'after before bottom charSpace fmt footer gutter h header id left linePitch right space top type val w'.split(
      ' ',
    ),
  'word/document.xml|http://www.w3.org/XML/1998/namespace': ['space'],
  'word/styles.xml|http://schemas.openxmlformats.org/markup-compatibility/2006': ['Ignorable'],
  [`word/styles.xml|${W}`]:
    'after ascii before bidi color cs default eastAsia hAnsi space styleId sz type val'.split(' '),
  [`word/fontTable.xml|${W}`]: 'characterSet name val'.split(' '),
  'word/settings.xml|http://schemas.openxmlformats.org/wordprocessingml/2006/main': [
    'name',
    'percent',
    'uri',
    'val',
  ],
  'word/theme/theme1.xml|': 'algn cap charset cmpd name pitchFamily typeface val w'.split(' '),
  'xl/workbook.xml|':
    'activeTab appName autoFilterDateGrouping backupFile calcId date1904 firstSheet fullCalcOnLoad hidden iterate iterateCount iterateDelta localSheetId lowestEdited minimized name refMode sheetId showHorizontalScroll showObjects showSheetTabs showVerticalScroll state stringRefSyntax tabRatio uri visibility windowHeight windowWidth xWindow yWindow'.split(
      ' ',
    ),
  'xl/workbook.xml|http://schemas.openxmlformats.org/officeDocument/2006/relationships': ['id'],
  'xl/theme/theme1.xml|': 'algn cap charset cmpd name pitchFamily typeface val w'.split(' '),
  'xl/sharedStrings.xml|': ['count', 'uniqueCount'],
  'xl/sharedStrings.xml|http://www.w3.org/XML/1998/namespace': ['space'],
  'xl/styles.xml|':
    'applyAlignment applyBorder applyFont applyProtection borderId builtinId count diagonalDown diagonalUp fillId fontId formatCode hidden horizontal indent locked name numFmtId patternType pivotButton quotePrefix rgb shrinkToFit textRotation val vertical wrapText xfId'.split(
      ' ',
    ),
  'xl/worksheets/sheetN.xml|':
    'activeCell activeCellId activePane baseColWidth blackAndWhite bottom cellComments collapsed colorId copies count customFormat customHeight customWidth defaultColWidth defaultGridColor defaultRowHeight differentFirst differentOddEven draft filterMode firstPageNumber fitToHeight fitToPage fitToWidth footer gridLines gridLinesSet header headings hidden horizontalCentered horizontalDpi ht id left max min orientation outlineLevel outlineLevelCol outlineLevelRow pageOrder pane paperSize r ref right rightToLeft s scale showFormulas showGridLines showOutlineSymbols showRowColHeaders showZeros sqref state style summaryBelow summaryRight t tabSelected top topLeftCell useFirstPageNumber verticalCentered verticalDpi view width workbookViewId ySplit zeroHeight zoomScale zoomScaleNormal zoomScalePageLayoutView'.split(
      ' ',
    ),
  'xl/worksheets/sheetN.xml|http://schemas.openxmlformats.org/officeDocument/2006/relationships': [
    'id',
  ],
};

type XmlAttribute = { uri: string; local: string; value: string };
type XmlNode = {
  qualified: string;
  uri: string;
  local: string;
  attributes: XmlAttribute[];
  children: XmlNode[];
  text: string[];
};
type Relationship = {
  source: string;
  relsPart: string;
  id: string;
  type: string;
  target: string;
  targetMode: 'Internal' | 'External';
};

export interface OoxmlGraphSnapshot {
  readonly kind: OfficeKind;
  readonly partManifestSha256: string;
  readonly contentTypesSha256: string;
  readonly relationshipGraphSha256: string;
  readonly surfaceManifestSha256: string;
  readonly parts: readonly { name: string; contentType: string; policy: string }[];
  readonly relationships: readonly Relationship[];
  readonly surfaceCounts: Readonly<Record<string, number>>;
}

function block(blockers: Set<string>) {
  if (blockers.size) throw new OoxmlBlockedError([...blockers].sort());
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function pattern(pattern: string): RegExp {
  let value = '';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]!;
    if (char === '{') {
      const close = pattern.indexOf('}', index);
      if (close < 0) throw new Error(`Invalid contract pattern: ${pattern}`);
      value += `(?:${pattern
        .slice(index + 1, close)
        .split('|')
        .map(patternFragment)
        .join('|')})`;
      index = close;
    } else if (char === '<') {
      const close = pattern.indexOf('>', index);
      const token = pattern.slice(index + 1, close);
      value +=
        token === 'opaque'
          ? '[^/]+'
          : token === 'source'
            ? '(?:document|header[1-9][0-9]*|footer[1-9][0-9]*|footnotes|endnotes|comments)'
            : '<[^>]+>';
      index = close;
    } else if (char === 'N') value += '[1-9][0-9]*';
    else value += patternText(char);
  }
  return new RegExp(`^${value}$`, 'u');
}

function patternFragment(value: string): string {
  return [...value]
    .map((character) => (character === 'N' ? '[1-9][0-9]*' : patternText(character)))
    .join('');
}

function patternText(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function isMatch(value: string, contractPattern: string): boolean {
  return pattern(contractPattern).test(value);
}

export function matchesOoxmlContractPattern(value: string, contractPattern: string): boolean {
  return isMatch(value, contractPattern);
}

function parseXml(xml: string, part: string, blockers: Set<string>): XmlNode | undefined {
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/iu.test(xml)) {
    blockers.add(`unsafe-xml:${part}`);
    return undefined;
  }
  const roots: XmlNode[] = [];
  const stack: { node: XmlNode; namespaces: Map<string, string> }[] = [];
  let nodes = 0;
  const token = /<[^>]*>|[^<]+/gu;
  for (const match of xml.matchAll(token)) {
    const value = match[0]!;
    if (!value.startsWith('<')) {
      if (value.length > MAX_XML_TEXT) blockers.add(`xml-text-limit:${part}`);
      if (stack.length) stack[stack.length - 1]!.node.text.push(value);
      continue;
    }
    if (/^<\?xml\s[^?]*\?>$/u.test(value) || /^<!--(?:.|\n|\r)*-->$/u.test(value)) continue;
    if (value.startsWith('</')) {
      const close = value.slice(2, -1).trim();
      const [prefix] = qualifiedName(close);
      if (prefix && !stack.at(-1)?.namespaces.has(prefix))
        blockers.add(`xml-unbound-prefix:${part}:${prefix}`);
      if (!stack.length || close !== stack[stack.length - 1]!.node.qualified) {
        blockers.add(`invalid-xml:${part}`);
        return undefined;
      }
      stack.pop();
      continue;
    }
    if (value.startsWith('<!') || value.startsWith('<?')) {
      blockers.add(`invalid-xml:${part}`);
      return undefined;
    }
    const body = value.slice(1, -1).trim();
    const selfClosing = body.endsWith('/');
    const opening = (selfClosing ? body.slice(0, -1) : body).trim();
    const nameMatch = /^([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)(?:\s|$)/u.exec(opening);
    if (!nameMatch) {
      blockers.add(`invalid-xml:${part}`);
      return undefined;
    }
    const qualified = nameMatch[1]!;
    const attributesText = opening.slice(nameMatch[0].length);
    const rawAttributes = [
      ...attributesText.matchAll(/([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)\s*=\s*(["'])(.*?)\2/gu),
    ];
    if (rawAttributes.length > MAX_XML_ATTRIBUTES) blockers.add(`xml-attribute-limit:${part}`);
    if (
      attributesText
        .replace(/([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)\s*=\s*(["'])(.*?)\2/gu, '')
        .trim()
    ) {
      blockers.add(`invalid-xml:${part}`);
      return undefined;
    }
    const namespaces = new Map(
      stack.at(-1)?.namespaces ?? [['xml', 'http://www.w3.org/XML/1998/namespace']],
    );
    for (const attribute of rawAttributes) {
      if (attribute[1] === 'xmlns') namespaces.set('', attribute[3]!);
      else if (attribute[1]!.startsWith('xmlns:'))
        namespaces.set(attribute[1]!.slice(6), attribute[3]!);
    }
    const [prefix, local] = qualifiedName(qualified);
    if (prefix && !namespaces.has(prefix)) blockers.add(`xml-unbound-prefix:${part}:${prefix}`);
    const uri = namespaces.get(prefix) ?? '';
    const seen = new Set<string>();
    const attributes: XmlAttribute[] = [];
    for (const attribute of rawAttributes) {
      const name = attribute[1]!;
      if (name === 'xmlns' || name.startsWith('xmlns:')) continue;
      const [attributePrefix, attributeLocal] = qualifiedName(name);
      if (attributePrefix && !namespaces.has(attributePrefix))
        blockers.add(`xml-unbound-prefix:${part}:${attributePrefix}`);
      const attributeUri = attributePrefix ? (namespaces.get(attributePrefix) ?? '') : '';
      const key = `${attributeUri}\u0000${attributeLocal}`;
      if (seen.has(key)) blockers.add(`duplicate-xml-attribute:${part}:${name}`);
      seen.add(key);
      attributes.push({ uri: attributeUri, local: attributeLocal, value: attribute[3]! });
    }
    const node: XmlNode = { qualified, uri, local, attributes, children: [], text: [] };
    nodes++;
    if (nodes > MAX_XML_NODES) blockers.add(`xml-node-limit:${part}`);
    if (stack.length + 1 > MAX_XML_DEPTH) blockers.add(`xml-depth-limit:${part}`);
    if (stack.length) stack[stack.length - 1]!.node.children.push(node);
    else roots.push(node);
    if (!selfClosing) stack.push({ node, namespaces });
  }
  if (stack.length || roots.length !== 1) blockers.add(`invalid-xml:${part}`);
  return roots[0];
}

function qualifiedName(value: string): [string, string] {
  const colon = value.indexOf(':');
  return colon < 0 ? ['', value] : [value.slice(0, colon), value.slice(colon + 1)];
}
function attributes(node: XmlNode, local: string): string | undefined {
  return node.attributes.find((attribute) => attribute.local === local)?.value;
}

function relationshipSource(relsPart: string): string | undefined {
  if (relsPart === '_rels/.rels') return '';
  const match = /^(.*)\/_rels\/([^/]+)\.rels$/u.exec(relsPart);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

function resolveTarget(source: string, target: string): string | undefined {
  if (!target || target.includes('\\') || target.includes('#') || target.includes('?'))
    return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return undefined;
  }
  if (
    decoded !== target &&
    (decoded.includes('\\') || decoded.includes('#') || decoded.includes('?'))
  )
    return undefined;
  const base = source ? posix.dirname(source) : '';
  const result = posix.normalize(
    decoded.startsWith('/') ? decoded.slice(1) : posix.join(base, decoded),
  );
  if (!result || result === '.' || result.startsWith('../') || result.includes('/../'))
    return undefined;
  return result;
}

function parseContentTypes(
  root: XmlNode | undefined,
  entries: readonly ZipEntry[],
  kind: OfficeKind,
  blockers: Set<string>,
) {
  const overrides = new Map<string, string>();
  const defaults = new Map<string, string>();
  if (!root || root.uri !== CONTENT_TYPES_NS || root.local !== 'Types') {
    blockers.add('content-types-root');
    return { overrides, defaults };
  }
  for (const child of root.children) {
    if (child.uri !== CONTENT_TYPES_NS || !['Default', 'Override'].includes(child.local)) {
      blockers.add('content-types-unknown');
      continue;
    }
    const contentType = attributes(child, 'ContentType');
    const key =
      child.local === 'Default'
        ? attributes(child, 'Extension')?.toLowerCase()
        : attributes(child, 'PartName')?.replace(/^\//u, '');
    if (!key || !contentType || child.children.length || child.text.some((text) => text.trim())) {
      blockers.add('content-types-invalid');
      continue;
    }
    const map = child.local === 'Default' ? defaults : overrides;
    if (map.has(key)) blockers.add(`content-type-duplicate:${key}`);
    map.set(key, contentType);
  }
  const parts = OOXML_CONTRACTS.parts.filter((contract) => contract.package === kind);
  const entryNames = new Set(entries.map((entry) => entry.name));
  for (const [part] of overrides)
    if (!entryNames.has(part)) blockers.add(`content-type-unknown:${part}`);
  for (const [extension] of defaults) {
    if (!['rels', 'xml', 'png', 'jpg', 'jpeg', 'fntdata'].includes(extension))
      blockers.add(`content-type-unknown-default:${extension}`);
  }
  for (const entry of entries) {
    if (entry.name === '[Content_Types].xml') continue;
    const contract = parts.find((candidate) => isMatch(entry.name, candidate.part_pattern));
    if (!contract) continue;
    if (contract.content_type === 'N/A') continue;
    const extension = entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase();
    const resolved = overrides.get(entry.name) ?? defaults.get(extension);
    if (
      !resolved ||
      (!overrides.has(entry.name) && contract.content_type !== defaults.get(extension))
    )
      blockers.add(`content-type-missing:${entry.name}`);
    else if (resolved !== contract.content_type) blockers.add(`content-type-unknown:${entry.name}`);
  }
  return { overrides, defaults };
}

function cardinalityOk(value: number, cardinality: string): boolean {
  if (cardinality === 'exactly-1') return value === 1;
  if (cardinality === '0-or-1') return value <= 1;
  if (cardinality === '1-to-100') return value >= 1 && value <= 100;
  if (cardinality === '0-to-200') return value <= 200;
  return true;
}

function parseRelationships(
  entries: readonly ZipEntry[],
  kind: OfficeKind,
  blockers: Set<string>,
): Relationship[] {
  const relationships: Relationship[] = [];
  const entryNames = new Set(entries.map((entry) => entry.name));
  for (const entry of entries.filter((candidate) => candidate.name.endsWith('.rels'))) {
    const root = parseXml(entry.data.toString('utf8'), entry.name, blockers);
    const source = relationshipSource(entry.name);
    if (
      !root ||
      source === undefined ||
      root.uri !== RELATIONSHIPS_NS ||
      root.local !== 'Relationships'
    ) {
      blockers.add(`relationship-root:${entry.name}`);
      continue;
    }
    const ids = new Set<string>();
    for (const child of root.children) {
      const id = attributes(child, 'Id') ?? '';
      const type = attributes(child, 'Type') ?? '';
      const target = attributes(child, 'Target') ?? '';
      const mode = (attributes(child, 'TargetMode') ?? 'Internal') as 'Internal' | 'External';
      if (
        child.uri !== RELATIONSHIPS_NS ||
        child.local !== 'Relationship' ||
        child.attributes.length < 3 ||
        child.children.length ||
        child.text.some((text) => text.trim())
      ) {
        blockers.add(`relationship-invalid:${entry.name}`);
        continue;
      }
      if (ids.has(id)) blockers.add(`relationship-duplicate-id:${entry.name}:${id}`);
      ids.add(id);
      if (mode !== 'Internal' && mode !== 'External')
        blockers.add(`relationship-target-mode:${entry.name}:${id}`);
      const relationship = {
        source,
        relsPart: entry.name,
        id,
        type,
        target,
        targetMode: mode,
      } as Relationship;
      if (mode === 'Internal') {
        const resolved = resolveTarget(source, target);
        if (!resolved) blockers.add(`relationship-target-invalid:${entry.name}:${id}`);
        else {
          relationship.target = resolved;
          if (!entryNames.has(resolved)) blockers.add(`relationship-dangling:${entry.name}:${id}`);
        }
      } else if (!/^(?:https?:\/\/|mailto:)/iu.test(target))
        blockers.add(`relationship-target-invalid:${entry.name}:${id}`);
      relationships.push(relationship);
    }
  }
  const contracts = OOXML_CONTRACTS.relationships.filter((contract) => contract.package === kind);
  const matched = new Map<RelationshipContract, Relationship[]>();
  for (const relationship of relationships) {
    const candidates = contracts.filter(
      (contract) =>
        isMatch(
          relationship.source ? relationship.source : '_rels/.rels',
          contract.source_part_pattern,
        ) &&
        contract.type_uri === relationship.type &&
        contract.target_mode === relationship.targetMode &&
        (contract.target_part_pattern === '<external-uri>'
          ? relationship.targetMode === 'External'
          : relationship.targetMode === 'Internal' &&
            isMatch(relationship.target, contract.target_part_pattern)),
    );
    if (candidates.length !== 1) {
      blockers.add(`relationship-contract:${relationship.relsPart}:${relationship.id}`);
      continue;
    }
    const candidate = candidates[0]!;
    const values = matched.get(candidate) ?? [];
    values.push(relationship);
    matched.set(candidate, values);
  }
  for (const contract of contracts) {
    const values = matched.get(contract) ?? [];
    if (!cardinalityOk(values.length, contract.cardinality))
      blockers.add(`relationship-cardinality:${contract.source_part_pattern}:${contract.type_uri}`);
  }
  return relationships;
}

function surfaceMatches(
  rule: SurfaceContract,
  part: string,
  node: XmlNode,
  kind: 'ELEMENT' | 'TEXT' | 'ATTRIBUTE',
  attribute?: XmlAttribute,
  parent?: XmlNode,
): boolean {
  if (
    !isMatch(part, rule.part_pattern) ||
    rule.node_kind !== kind ||
    rule.namespace_uri !== node.uri ||
    rule.element_local_name !== node.local
  )
    return false;
  if (
    kind === 'ATTRIBUTE' &&
    (rule.attribute_namespace_uri !== (attribute!.uri || 'N/A') ||
      rule.attribute_local_name !== attribute!.local)
  )
    return false;
  if (rule.context_predicate === 'ANY') return true;
  if (!parent || parent.local !== 'c') return false;
  return (
    rule.context_predicate === 'PARENT_C' ||
    (rule.context_predicate === 'PARENT_C_WITHOUT_SIBLING_F' &&
      !parent.children.some((child) => child.local === 'f')) ||
    (rule.context_predicate === 'PARENT_C_WITH_SIBLING_F' &&
      parent.children.some((child) => child.local === 'f'))
  );
}

function structuralValues(
  table: Readonly<Record<string, readonly string[]>>,
  part: string,
  uri: string,
): readonly string[] {
  for (const [key, values] of Object.entries(table)) {
    const separator = key.lastIndexOf('|');
    if (
      separator >= 0 &&
      key.slice(separator + 1) === uri &&
      isMatch(part, key.slice(0, separator))
    )
      return values;
  }
  return [];
}

function hasStructuralNamespace(
  table: Readonly<Record<string, readonly string[]>>,
  part: string,
  uri: string,
): boolean {
  return structuralValues(table, part, uri).length > 0;
}

function traverseSurface(
  part: string,
  root: XmlNode | undefined,
  kind: OfficeKind,
  blockers: Set<string>,
  counts: Map<string, number>,
  parent?: XmlNode,
): void {
  if (!root) return;
  const rules = OOXML_CONTRACTS.surfaces.filter((rule) => rule.package === kind);
  const element = rules.find((rule) =>
    surfaceMatches(rule, part, root, 'ELEMENT', undefined, parent),
  );
  const structural = structuralValues(structuralElements, part, root.uri).includes(root.local);
  if (!element && !structural) {
    const knownNamespace =
      rules.some((rule) => isMatch(part, rule.part_pattern) && rule.namespace_uri === root.uri) ||
      hasStructuralNamespace(structuralElements, part, root.uri);
    blockers.add(
      knownNamespace
        ? `surface-qname:${part}:{${root.uri}}${root.local}`
        : `surface-namespace:${part}`,
    );
  } else {
    const surfaceClass = element?.surface_class ?? 'PRESERVE_VALIDATED';
    counts.set(surfaceClass, (counts.get(surfaceClass) ?? 0) + 1);
    if (surfaceClass === 'REJECT')
      blockers.add(`unsupported-surface:${part}:{${root.uri}}${root.local}`);
  }
  for (const attribute of root.attributes) {
    const matched = rules.find((rule) =>
      surfaceMatches(rule, part, root, 'ATTRIBUTE', attribute, parent),
    );
    const structuralAttribute = structuralValues(
      structuralAttributes,
      part,
      attribute.uri,
    ).includes(attribute.local);
    if (!matched && !structuralAttribute)
      blockers.add(`surface-attribute:${part}:${attribute.local}`);
    else {
      const surfaceClass = matched?.surface_class ?? 'PRESERVE_VALIDATED';
      counts.set(surfaceClass, (counts.get(surfaceClass) ?? 0) + 1);
      if (surfaceClass === 'REJECT')
        blockers.add(`unsupported-surface:${part}:{${root.uri}}${root.local}@${attribute.local}`);
    }
  }
  if (root.text.some((text) => text.trim())) {
    const matched = rules.find((rule) =>
      surfaceMatches(rule, part, root, 'TEXT', undefined, parent),
    );
    if (!matched && !structural) blockers.add(`surface-qname:${part}:{${root.uri}}${root.local}`);
    else {
      const surfaceClass = matched?.surface_class ?? 'PRESERVE_VALIDATED';
      counts.set(surfaceClass, (counts.get(surfaceClass) ?? 0) + 1);
      if (surfaceClass === 'REJECT')
        blockers.add(`unsupported-surface:${part}:{${root.uri}}${root.local}`);
    }
  }
  for (const child of root.children) traverseSurface(part, child, kind, blockers, counts, root);
}

export function preflightOoxml(source: Buffer, kind: OfficeKind): ZipEntry[] {
  return preflightOoxmlSnapshot(source, kind).entries;
}

export function preflightOoxmlSnapshot(
  source: Buffer,
  kind: OfficeKind,
): OoxmlGraphSnapshot & { entries: ZipEntry[] } {
  const entries = readZip(source);
  const blockers = new Set<string>();
  const parts = OOXML_CONTRACTS.parts.filter((contract) => contract.package === kind);
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  for (const entry of entries) {
    const matching = parts.filter((contract) => isMatch(entry.name, contract.part_pattern));
    if (matching.length !== 1) blockers.add(`unknown-part:${entry.name}`);
    if (entry.name.endsWith('.xml') || entry.name.endsWith('.rels'))
      parseXml(entry.data.toString('utf8'), entry.name, blockers);
  }
  for (const contract of parts) {
    const count = entries.filter((entry) => isMatch(entry.name, contract.part_pattern)).length;
    if (!cardinalityOk(count, contract.cardinality))
      blockers.add(`part-cardinality:${contract.part_pattern}`);
  }
  const contentTypesEntry = byName.get('[Content_Types].xml');
  const contentTypes = parseContentTypes(
    contentTypesEntry
      ? parseXml(contentTypesEntry.data.toString('utf8'), contentTypesEntry.name, blockers)
      : undefined,
    entries,
    kind,
    blockers,
  );
  if (!contentTypesEntry) blockers.add('content-types-missing');
  const relationships = parseRelationships(entries, kind, blockers);
  const referenced = new Set(
    relationships
      .filter((relationship) => relationship.targetMode === 'Internal')
      .map((relationship) => relationship.target),
  );
  for (const entry of entries) {
    if (
      entry.name === '[Content_Types].xml' ||
      entry.name.endsWith('.rels') ||
      entry.name === '_rels/.rels'
    )
      continue;
    if (!referenced.has(entry.name)) blockers.add(`unreferenced-part:${entry.name}`);
  }
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.name.endsWith('.xml') || entry.name === '[Content_Types].xml') continue;
    const contract = parts.find((candidate) => isMatch(entry.name, candidate.part_pattern));
    if (!contract || contract.policy === 'ALLOW_RELS') continue;
    traverseSurface(
      entry.name,
      parseXml(entry.data.toString('utf8'), entry.name, blockers),
      kind,
      blockers,
      counts,
    );
  }
  block(blockers);
  const partSnapshot = entries
    .map((entry) => {
      const contract = parts.find((candidate) => isMatch(entry.name, candidate.part_pattern))!;
      const extension = entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase();
      return {
        name: entry.name,
        contentType:
          entry.name === '[Content_Types].xml'
            ? 'N/A'
            : (contentTypes.overrides.get(entry.name) ??
              contentTypes.defaults.get(extension) ??
              'N/A'),
        policy: contract.policy,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const graph = relationships
    .map((relationship) => ({ ...relationship }))
    .sort((left, right) =>
      `${left.relsPart}:${left.id}`.localeCompare(`${right.relsPart}:${right.id}`),
    );
  const surfaceCounts = Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
  return Object.freeze({
    kind,
    entries,
    parts: partSnapshot,
    relationships: graph,
    surfaceCounts,
    partManifestSha256: sha256(partSnapshot),
    contentTypesSha256: sha256([...contentTypes.overrides, ...contentTypes.defaults]),
    relationshipGraphSha256: sha256(graph),
    surfaceManifestSha256: sha256(surfaceCounts),
  });
}

export function assertOoxmlGraphConservation(
  input: Buffer,
  output: Buffer,
  kind: OfficeKind,
  options: { readonly allowTypedTextSurfaceChange?: boolean } = {},
): void {
  const before = preflightOoxmlSnapshot(input, kind);
  const after = preflightOoxmlSnapshot(output, kind);
  if (
    before.partManifestSha256 !== after.partManifestSha256 ||
    before.contentTypesSha256 !== after.contentTypesSha256 ||
    before.relationshipGraphSha256 !== after.relationshipGraphSha256 ||
    (!options.allowTypedTextSurfaceChange &&
      before.surfaceManifestSha256 !== after.surfaceManifestSha256)
  )
    throw new OoxmlBlockedError(['ooxml-graph-conservation']);
}
